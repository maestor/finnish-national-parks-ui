import { describe, expect, it } from "vitest";
import {
  filterTripStories,
  getTripStoryFilterOptions,
  parseTripStoryFilters,
  selectHomeTripStories,
} from "./trip-stories";
import type { TripStorySummary } from "./trips";

const story = (overrides: Partial<TripStorySummary> = {}): TripStorySummary => ({
  coverImage: null,
  dateRange: { end: "2025-10-02", start: "2025-10-01" },
  featured: false,
  imageCount: 1,
  name: "Syysretki",
  places: [{ name: "Pallas-Yllästunturi", slug: "pallas-yllastunturi" }],
  publishedAt: "2025-10-03T10:00:00.000Z",
  seasons: ["autumn"],
  slug: "syysretki",
  stopCount: 0,
  summary: null,
  updatedAt: "2025-10-03T10:00:00.000Z",
  visitCount: 1,
  years: [2025],
  ...overrides,
});

describe("trip story models", () => {
  it("ignores invalid and repeated search parameters", () => {
    const stories = [story()];
    expect(
      parseTripStoryFilters(
        { place: ["pallas-yllastunturi", "other"], season: "bad", year: "2024" },
        stories,
      ),
    ).toEqual({
      place: "pallas-yllastunturi",
      season: null,
      year: null,
    });
  });

  it("accepts valid year, season, and place parameters", () => {
    const stories = [story()];

    expect(
      parseTripStoryFilters(
        { place: "pallas-yllastunturi", season: "autumn", year: "2025" },
        stories,
      ),
    ).toEqual({ place: "pallas-yllastunturi", season: "autumn", year: 2025 });
  });

  it("applies year, season, and place as combined filters", () => {
    const stories = [
      story(),
      story({
        name: "Kesäretki",
        slug: "kesaretki",
        places: [{ name: "Evo", slug: "evo" }],
        seasons: ["summer"],
        years: [2024],
      }),
    ];
    expect(filterTripStories(stories, { place: "evo", season: "summer", year: 2024 })).toHaveLength(
      1,
    );
    expect(getTripStoryFilterOptions(stories).years).toEqual([2025, 2024]);
  });

  it("selects manual feature, capped recent stories, and nearby seasonal memory without duplicates", () => {
    const manual = story({ featured: true, name: "Poiminta", slug: "poiminta" });
    const recent = story({ name: "Uusin", slug: "uusin", publishedAt: "2025-11-01T00:00:00.000Z" });
    const memory = story({
      name: "Muisto",
      slug: "muisto",
      dateRange: { end: "2023-09-30", start: "2023-09-29" },
      years: [2023],
      publishedAt: "2023-10-01T00:00:00.000Z",
    });
    const model = selectHomeTripStories(
      [manual, recent, memory],
      new Date("2025-10-01T00:00:00.000Z"),
    );
    expect(model.featured?.slug).toBe("poiminta");
    expect(model.recent.map((item) => item.slug)).toEqual(["uusin", "muisto"]);
    expect(model.seasonalMemory).toBeNull();
  });

  it("returns empty selections for no stories", () => {
    expect(selectHomeTripStories([], new Date("2025-10-01T00:00:00.000Z"))).toEqual({
      featured: null,
      featuredReason: null,
      recent: [],
      seasonalMemory: null,
    });
  });
});
