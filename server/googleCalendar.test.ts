import { describe, expect, it } from "vitest";
import { buildGoogleCalendarEvent } from "./googleCalendar";

const base = {
  id: "task-1",
  title: "Finish biology lab",
  date: "2026-08-14",
  duration: 60,
  category: "School",
  subject: "IB Biology",
  reminder: "10" as const,
  notes: "Bring observations.",
  timeZone: "America/Chicago",
};

describe("Google Calendar event payloads", () => {
  it("creates a timed event with the selected mobile popup reminder", () => {
    const event = buildGoogleCalendarEvent({ ...base, time: "15:30" });

    expect(event.start).toEqual({ dateTime: "2026-08-14T15:30:00", timeZone: "America/Chicago" });
    expect(event.end).toEqual({ dateTime: "2026-08-14T16:30:00", timeZone: "America/Chicago" });
    expect(event.reminders).toEqual({ useDefault: false, overrides: [{ method: "popup", minutes: 10 }] });
    expect(event.description).toContain("Subject: IB Biology");
  });

  it("creates all-day events and suppresses a reminder when none is selected", () => {
    const event = buildGoogleCalendarEvent({ ...base, time: "", reminder: "0" });

    expect(event.start).toEqual({ date: "2026-08-14" });
    expect(event.end).toEqual({ date: "2026-08-15" });
    expect(event.reminders).toEqual({ useDefault: false, overrides: [] });
  });
});
