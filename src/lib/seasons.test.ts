import { describe, expect, it } from "vitest";
import { getVisitSeason } from "./seasons";

describe("visit calendar seasons", () => {
  it.each([
    ["2026-01-01", "winter"],
    ["2026-02-28", "winter"],
    ["2026-03-01", "spring"],
    ["2026-05-31", "spring"],
    ["2026-06-01", "summer"],
    ["2026-08-31", "summer"],
    ["2026-09-01", "autumn"],
    ["2026-11-30", "autumn"],
    ["2026-12-01", "winter"],
  ])("classifies %s by its calendar month as %s", (date, season) => {
    expect(getVisitSeason(date)).toBe(season);
  });
});
