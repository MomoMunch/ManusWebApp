import { describe, expect, it } from "vitest";
import { dayKey, formatTime, shiftDay } from "./Home";

describe("Athenaeum school-hub scheduling helpers", () => {
  it("creates local calendar keys without a timezone timestamp", () => {
    expect(dayKey(new Date("2026-08-12T12:00:00.000Z"))).toBe("2026-08-12");
  });

  it("moves dates by whole calendar days for planning", () => {
    expect(shiftDay(3, new Date("2026-08-12T12:00:00.000Z"))).toBe("2026-08-15");
  });

  it("formats optional event times in a readable agenda style", () => {
    expect(formatTime("13:05")).toBe("1:05 PM");
    expect(formatTime("")).toBe("Any time");
  });
});
