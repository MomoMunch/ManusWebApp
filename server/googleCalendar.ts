import { TRPCError } from "@trpc/server";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "./db";
import { ENV } from "./_core/env";
import { getSessionCookieOptions } from "./_core/cookies";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GOOGLE_CONNECTION_COOKIE = "__Host-athenaeum_google_connection";
const GOOGLE_STATE_COOKIE = "__Host-athenaeum_google_state";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

export type GoogleCalendarEventInput = {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  category: string;
  subject?: string;
  reminder: "default" | "0" | "10" | "30" | "60";
  notes?: string;
  eventId?: string;
  timeZone: string;
};

function requireGoogleConfiguration() {
  if (!ENV.googleClientId || !ENV.googleClientSecret) {
    throw new Error("Google Calendar credentials are not configured");
  }
}

function getOrigin(req: Request) {
  const protocol = req.headers["x-forwarded-proto"]?.toString().split(",")[0] || req.protocol;
  const host = req.get("host");
  if (!host) throw new Error("Unable to determine the public application URL");
  return `${protocol}://${host}`;
}

export function getGoogleCallbackUrl(req: Request) {
  return `${getOrigin(req)}/api/integrations/google/callback`;
}

function cookieValue(req: Request, key: string) {
  return parseCookieHeader(req.headers.cookie ?? "")[key];
}

function tokenKey() {
  const material = ENV.cookieSecret || ENV.googleClientSecret;
  if (!material) throw new Error("An application encryption key is required");
  return createHash("sha256").update(material).digest();
}

export function encryptGoogleToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptGoogleToken(value: string) {
  const [ivText, tagText, ciphertext] = value.split(".");
  if (!ivText || !tagText || !ciphertext) throw new Error("Invalid encrypted Google token");
  const decipher = createDecipheriv("aes-256-gcm", tokenKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

async function exchangeCode(code: string, redirectUri: string) {
  const form = new URLSearchParams({
    code,
    client_id: ENV.googleClientId,
    client_secret: ENV.googleClientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const payload = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Google did not return an access token");
  }
  return payload;
}

async function refreshAccessToken(refreshToken: string) {
  const form = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: ENV.googleClientId,
    client_secret: ENV.googleClientSecret,
    grant_type: "refresh_token",
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const payload = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Google Calendar connection expired; reconnect your account");
  }
  return payload;
}

function addOneDay(date: string) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + 1);
  return next.toISOString().slice(0, 10);
}

function endDateTime(date: string, time: string, duration: number) {
  const start = new Date(`${date}T${time}:00`);
  start.setMinutes(start.getMinutes() + Math.max(15, duration || 60));
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}:00`;
}

export function buildGoogleCalendarEvent(input: GoogleCalendarEventInput) {
  const reminderMinutes = Number(input.reminder);
  const descriptionLines = [
    "Created with Athenaeum.",
    input.subject ? `Subject: ${input.subject}` : `Category: ${input.category}`,
    input.notes?.trim(),
  ].filter(Boolean);
  const dateFields = input.time
    ? {
        start: { dateTime: `${input.date}T${input.time}:00`, timeZone: input.timeZone },
        end: { dateTime: endDateTime(input.date, input.time, input.duration), timeZone: input.timeZone },
      }
    : { start: { date: input.date }, end: { date: addOneDay(input.date) } };
  return {
    summary: input.title,
    description: descriptionLines.join("\n"),
    ...dateFields,
    reminders: input.reminder === "default"
      ? { useDefault: true }
      : reminderMinutes > 0
      ? { useDefault: false, overrides: [{ method: "popup", minutes: reminderMinutes }] }
      : { useDefault: false, overrides: [] },
    extendedProperties: { private: { athenaeumItemId: input.id } },
  };
}

async function getConnectionAccessToken(req: Request) {
  requireGoogleConfiguration();
  const connectionId = cookieValue(req, GOOGLE_CONNECTION_COOKIE);
  if (!connectionId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect Google Calendar before scheduling an item." });
  }
  const connection = await db.getGoogleCalendarConnection(connectionId);
  if (!connection) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Your Google Calendar connection was not found. Please reconnect." });
  }

  const currentToken = decryptGoogleToken(connection.encryptedAccessToken);
  const expiresSoon = !connection.tokenExpiresAt || connection.tokenExpiresAt.getTime() < Date.now() + 60_000;
  if (!expiresSoon) return { accessToken: currentToken, connection };

  if (!connection.encryptedRefreshToken) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Your Google Calendar connection needs to be refreshed. Please reconnect." });
  }
  const refreshToken = decryptGoogleToken(connection.encryptedRefreshToken);
  const refreshed = await refreshAccessToken(refreshToken);
  await db.upsertGoogleCalendarConnection({
    connectionId,
    encryptedAccessToken: encryptGoogleToken(refreshed.access_token!),
    encryptedRefreshToken: encryptGoogleToken(refreshed.refresh_token || refreshToken),
    tokenExpiresAt: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000),
    calendarId: connection.calendarId,
  });
  return { accessToken: refreshed.access_token!, connection };
}

export async function getGoogleCalendarStatus(req: Request) {
  const connectionId = cookieValue(req, GOOGLE_CONNECTION_COOKIE);
  const connection = connectionId ? await db.getGoogleCalendarConnection(connectionId) : undefined;
  return { connected: Boolean(connection), callbackUrl: getGoogleCallbackUrl(req) };
}

export async function upsertGoogleCalendarEvent(req: Request, input: GoogleCalendarEventInput) {
  const { accessToken, connection } = await getConnectionAccessToken(req);
  const isUpdate = Boolean(input.eventId);
  const path = isUpdate
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendarId)}/events/${encodeURIComponent(input.eventId!)}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendarId)}/events`;
  const response = await fetch(path, {
    method: isUpdate ? "PATCH" : "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildGoogleCalendarEvent(input)),
  });
  const payload = (await response.json()) as { id?: string; htmlLink?: string; error?: { message?: string } };
  if (!response.ok || !payload.id) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: payload.error?.message || "Google Calendar could not save this item." });
  }
  return { eventId: payload.id, htmlLink: payload.htmlLink };
}

export function registerGoogleCalendarRoutes(app: Express) {
  app.get("/api/integrations/google/connect", (req: Request, res: Response) => {
    try {
      requireGoogleConfiguration();
      const state = randomUUID();
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(GOOGLE_STATE_COOKIE, state, { ...cookieOptions, maxAge: 10 * 60 * 1000 });
      const url = new URL(GOOGLE_AUTH_URL);
      url.search = new URLSearchParams({
        client_id: ENV.googleClientId,
        redirect_uri: getGoogleCallbackUrl(req),
        response_type: "code",
        scope: GOOGLE_EVENTS_SCOPE,
        access_type: "offline",
        prompt: "consent",
        state,
      }).toString();
      res.redirect(url.toString());
    } catch (error) {
      res.status(500).send(error instanceof Error ? error.message : "Unable to start Google Calendar authorization");
    }
  });

  app.get("/api/integrations/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const expectedState = cookieValue(req, GOOGLE_STATE_COOKIE);
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(GOOGLE_STATE_COOKIE, cookieOptions);
    if (!code || !state || !expectedState || state !== expectedState) {
      res.status(403).send("Google Calendar authorization could not be verified. Please return to Athenaeum and try again.");
      return;
    }
    try {
      const tokens = await exchangeCode(code, getGoogleCallbackUrl(req));
      const currentConnectionId = cookieValue(req, GOOGLE_CONNECTION_COOKIE);
      const connectionId = currentConnectionId || randomUUID();
      const previous = currentConnectionId ? await db.getGoogleCalendarConnection(currentConnectionId) : undefined;
      const priorRefresh = previous?.encryptedRefreshToken ? decryptGoogleToken(previous.encryptedRefreshToken) : undefined;
      const refreshToken = tokens.refresh_token || priorRefresh;
      if (!refreshToken) {
        throw new Error("Google did not return a refresh token. Remove Athenaeum from your Google Account permissions and connect again.");
      }
      await db.upsertGoogleCalendarConnection({
        connectionId,
        encryptedAccessToken: encryptGoogleToken(tokens.access_token!),
        encryptedRefreshToken: encryptGoogleToken(refreshToken),
        tokenExpiresAt: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000),
        calendarId: "primary",
      });
      res.cookie(GOOGLE_CONNECTION_COOKIE, connectionId, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/settings?google=connected");
    } catch (error) {
      console.error("[Google Calendar] OAuth callback failed", error);
      res.status(500).send(error instanceof Error ? error.message : "Google Calendar could not be connected.");
    }
  });
}
