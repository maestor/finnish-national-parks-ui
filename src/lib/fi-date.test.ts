import { describe, expect, it } from "vitest";
import { formatFinnishDate, formatFinnishDateRange, formatOptionalFinnishDate } from "./fi-date";

describe("fi-date", () => {
  it("formats timestamps in the Helsinki timezone", () => {
    expect(formatFinnishDate("2024-06-15T22:30:00Z")).toBe("16.6.2024");
  });

  it("formats missing optional dates as a dash", () => {
    expect(formatOptionalFinnishDate(null)).toBe("-");
  });

  it("formats same-day ranges as a single date", () => {
    expect(formatFinnishDateRange("2024-06-15", "2024-06-15")).toBe("15.6.2024");
  });

  it("formats same-month ranges in compact Finnish style", () => {
    expect(formatFinnishDateRange("2018-10-09", "2018-10-10")).toBe("9.-10.10.2018");
  });

  it("formats same-year cross-month ranges in compact Finnish style", () => {
    expect(formatFinnishDateRange("2020-07-31", "2020-08-03")).toBe("31.7.-3.8.2020");
  });

  it("keeps full dates when the year changes", () => {
    expect(formatFinnishDateRange("2024-12-31", "2025-01-02")).toBe("31.12.2024 - 2.1.2025");
  });
});
