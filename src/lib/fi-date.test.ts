import { describe, expect, it } from "vitest";
import { formatFinnishDate, formatOptionalFinnishDate } from "./fi-date";

describe("fi-date", () => {
  it("formats timestamps in the Helsinki timezone", () => {
    expect(formatFinnishDate("2024-06-15T22:30:00Z")).toBe("16.6.2024");
  });

  it("formats missing optional dates as a dash", () => {
    expect(formatOptionalFinnishDate(null)).toBe("-");
  });
});
