import { describe, expect, it } from "vitest";

const tokenEndpoint = "https://oauth2.googleapis.com/token";

describe("Google OAuth credential configuration", () => {
  it("is accepted by Google's token endpoint before a user authorization code is available", async () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    expect(clientId, "GOOGLE_CLIENT_ID must be configured").toBeTruthy();
    expect(clientSecret, "GOOGLE_CLIENT_SECRET must be configured").toBeTruthy();

    const form = new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      code: "athenaeum-credential-validation",
      grant_type: "authorization_code",
      redirect_uri: "https://localhost.invalid/api/integrations/google/callback",
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const body = (await response.json()) as { error?: string };

    // A deliberately invalid authorization code should produce invalid_grant.
    // invalid_client would indicate that the supplied OAuth credentials are rejected.
    expect(body.error).not.toBe("invalid_client");
    expect(response.status).not.toBe(401);
  }, 15_000);
});
