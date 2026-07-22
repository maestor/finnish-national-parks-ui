import { describe, expect, it } from "vitest";
import type { FrontendTimelineVisit } from "@/lib/public-visits";
import { buildYearReviewStats } from "./year-review";

const createVisit = (
  overrides: Partial<FrontendTimelineVisit> & { id: number; visitedOn: string },
): FrontendTimelineVisit => ({
  createdAt: `${overrides.visitedOn}T10:00:00Z`,
  imageCount: 0,
  route: null,
  park: { name: "Nuuksio", slug: "nuuksio", typeLabel: "Kansallispuisto" },
  ...overrides,
});

describe("buildYearReviewStats", () => {
  it("aggregates visits, parks, images, and active months for the year", () => {
    const visits = [
      createVisit({ id: 1, visitedOn: "2024-06-15" }),
      createVisit({
        id: 2,
        visitedOn: "2024-08-10",
        imageCount: 3,
        park: { name: "Pallas", slug: "pallas", typeLabel: "Kansallispuisto" },
      }),
      createVisit({ id: 3, visitedOn: "2024-06-20" }),
      createVisit({
        id: 4,
        visitedOn: "2025-02-05",
        park: { name: "Oulanka", slug: "oulanka", typeLabel: "Kansallispuisto" },
      }),
    ];

    expect(buildYearReviewStats(visits, 2024)).toEqual({
      year: 2024,
      visitCount: 3,
      distinctParkCount: 2,
      newParkCount: 2,
      revisitedParkCount: 0,
      mostVisitedPark: { name: "Nuuksio", slug: "nuuksio", visitCount: 2 },
      activeMonthCount: 2,
      imageCount: 3,
      seasonalVisits: { spring: 0, summer: 3, autumn: 0, winter: 0 },
    });
  });

  it("counts a park as new only when its earliest-ever visit falls in the year", () => {
    const visits = [
      createVisit({ id: 1, visitedOn: "2023-05-10" }),
      createVisit({ id: 2, visitedOn: "2024-03-15" }),
      createVisit({
        id: 3,
        visitedOn: "2024-07-01",
        park: { name: "Pallas", slug: "pallas", typeLabel: "Kansallispuisto" },
      }),
    ];

    const stats = buildYearReviewStats(visits, 2024);

    expect(stats.newParkCount).toBe(1);
    expect(stats.revisitedParkCount).toBe(1);
  });

  it("splits visits into Finnish seasons", () => {
    const visits = [
      createVisit({ id: 1, visitedOn: "2024-01-15" }),
      createVisit({ id: 2, visitedOn: "2024-03-10" }),
      createVisit({ id: 3, visitedOn: "2024-06-30" }),
      createVisit({ id: 4, visitedOn: "2024-09-01" }),
      createVisit({ id: 5, visitedOn: "2024-12-24" }),
    ];

    expect(buildYearReviewStats(visits, 2024).seasonalVisits).toEqual({
      spring: 1,
      summer: 1,
      autumn: 1,
      winter: 2,
    });
  });

  it("breaks most-visited ties deterministically by park name", () => {
    const visits = [
      createVisit({
        id: 1,
        visitedOn: "2024-06-01",
        park: { name: "Pallas", slug: "pallas", typeLabel: "Kansallispuisto" },
      }),
      createVisit({ id: 2, visitedOn: "2024-06-02" }),
    ];

    expect(buildYearReviewStats(visits, 2024).mostVisitedPark?.name).toBe("Nuuksio");
  });

  it("returns zeroed stats with no most-visited park for a year without visits", () => {
    const visits = [createVisit({ id: 1, visitedOn: "2023-06-15" })];

    expect(buildYearReviewStats(visits, 2024)).toEqual({
      year: 2024,
      visitCount: 0,
      distinctParkCount: 0,
      newParkCount: 0,
      revisitedParkCount: 0,
      mostVisitedPark: null,
      activeMonthCount: 0,
      imageCount: 0,
      seasonalVisits: { spring: 0, summer: 0, autumn: 0, winter: 0 },
    });
  });
});
