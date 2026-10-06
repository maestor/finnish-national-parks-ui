import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, apiPublicFetch } from "./api";
import type { HomeSummary } from "./frontend-summaries";
import {
  createHomeProgressItems,
  fetchHomeSummary,
  fetchMapSummary,
  fetchPublicParkDetail,
  fetchPublicParkVisits,
} from "./frontend-summaries";
import { getPublicParkTag } from "./public-cache";

vi.mock("./api", () => ({
  apiFetch: vi.fn(),
  apiPublicFetch: vi.fn(),
}));

const buildSummary = (): HomeSummary => ({
  totalVisits: 12,
  uniqueVisitedParks: 5,
  seasonalVisitCounts: {
    spring: 3,
    summer: 4,
    autumn: 3,
    winter: 2,
  },
  progressByType: [
    {
      type: {
        name: "Luontopolut",
        slug: "nature-trail",
      },
      visible: false,
      visitedParks: 1,
      totalParks: 7,
    },
    {
      type: {
        name: "Muut LS-alueet",
        slug: "nature-reserve-area",
      },
      visible: false,
      visitedParks: 2,
      totalParks: 4,
    },
    {
      type: {
        name: "Kansallispuistot",
        slug: "national-park",
      },
      visible: true,
      visitedParks: 3,
      totalParks: 8,
    },
    {
      type: {
        name: "Virkistysalueet",
        slug: "outdoor-recreation-area",
      },
      visible: true,
      visitedParks: 0,
      totalParks: 2,
    },
    {
      type: {
        name: "Historia-alue",
        slug: "cultural-history-area",
      },
      visible: true,
      visitedParks: 1,
      totalParks: 1,
    },
    {
      type: {
        name: "Erämaa-alueet",
        slug: "wilderness-area",
      },
      visible: true,
      visitedParks: 1,
      totalParks: 6,
    },
    {
      type: {
        name: "Retkeilyalueet",
        slug: "hiking-area",
      },
      visible: true,
      visitedParks: 1,
      totalParks: 3,
    },
    {
      type: {
        name: "Vaellusreitit",
        slug: "hiking-trail",
      },
      visible: false,
      visitedParks: 1,
      totalParks: 5,
    },
  ],
  progressByCategory: [
    {
      category: {
        name: "Kansallispuistot",
        slug: "national-park",
      },
      visitedParks: 3,
      totalParks: 8,
    },
    {
      category: {
        name: "Erämaa-/retkeilyalue",
        slug: "hiking-and-wilderness-areas",
      },
      visitedParks: 2,
      totalParks: 9,
    },
    {
      category: {
        name: "Muut LS-alueet",
        slug: "nature-reserve-area",
      },
      visitedParks: 2,
      totalParks: 4,
    },
    {
      category: {
        name: "Virkistysalueet",
        slug: "outdoor-recreation-area",
      },
      visitedParks: 0,
      totalParks: 2,
    },
    {
      category: {
        name: "Historia-alue",
        slug: "cultural-history-area",
      },
      visitedParks: 1,
      totalParks: 1,
    },
    {
      category: {
        name: "Polut ja reitit",
        slug: "trails-and-routes",
      },
      visitedParks: 2,
      totalParks: 12,
    },
  ],
  latestTrip: null,
  latestStandaloneVisit: null,
  featuredPark: null,
  featuredVisit: null,
  magnetProgress: { visitedParks: 3, totalParks: 8 },
  updatedAt: "2024-06-15T12:00:00.000Z",
  version: 1,
});

describe("createHomeProgressItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the combined hiking and wilderness category on the home page", () => {
    const progressItems = createHomeProgressItems(
      buildSummary(),
      "Kaikki paikat",
      "Magneettijahti",
    );

    expect(progressItems.map((item) => item.label)).toEqual([
      "Kaikki paikat",
      "Magneettijahti",
      "Kansallispuistot",
      "Erämaa-/retkeilyalue",
      "Virkistysalueet",
      "Historia-alue",
      "Polut ja reitit",
    ]);
    expect(progressItems[0]?.href).toBe("/paikat?filter=all&visitStatus=visited");
    expect(progressItems[2]?.href).toBe("/paikat?filter=national-park&visitStatus=visited");
    expect(progressItems[3]?.href).toBe(
      "/paikat?filter=hiking-and-wilderness-areas&visitStatus=visited",
    );
    expect(progressItems[5]?.href).toBe("/paikat?filter=cultural-history-area&visitStatus=visited");
    expect(progressItems[6]?.href).toBe("/paikat?filter=trails-and-routes&visitStatus=visited");
    expect(progressItems[0]?.total).toBe(36);
  });

  it("still returns the combined categories when typed progress is empty", () => {
    const summary = buildSummary();
    summary.progressByType = [];

    expect(createHomeProgressItems(summary, "Kaikki paikat", "Magneettijahti")).toEqual([
      {
        label: "Kaikki paikat",
        visited: 5,
        total: 36,
        href: "/paikat?filter=all&visitStatus=visited",
      },
      { label: "Magneettijahti", visited: 3, total: 8, href: "/kaynnit?view=parks" },
      {
        label: "Erämaa-/retkeilyalue",
        visited: 2,
        total: 9,
        href: "/paikat?filter=hiking-and-wilderness-areas&visitStatus=visited",
      },
      {
        label: "Polut ja reitit",
        visited: 2,
        total: 12,
        href: "/paikat?filter=trails-and-routes&visitStatus=visited",
      },
    ]);
  });

  it("keeps all-places and magnet rows when the catalog is empty", () => {
    const summary = buildSummary();
    summary.progressByType = [];
    summary.progressByCategory = [];
    summary.uniqueVisitedParks = 0;
    summary.magnetProgress = { totalParks: 0, visitedParks: 0 };

    expect(createHomeProgressItems(summary, "Kaikki paikat", "Magneettijahti")).toEqual([
      {
        label: "Kaikki paikat",
        visited: 0,
        total: 0,
        href: "/paikat?filter=all&visitStatus=visited",
      },
      { label: "Magneettijahti", visited: 0, total: 0, href: "/kaynnit?view=parks" },
    ]);
  });

  it("fetches public park detail through the server-side API client", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ slug: "riisitunturi" });

    await fetchPublicParkDetail("riisitunturi", { includeBoundary: true });

    expect(apiFetch).toHaveBeenCalledWith("/api/parks/riisitunturi?includeBoundary=true", {
      cache: "force-cache",
      next: {
        tags: [getPublicParkTag("riisitunturi")],
      },
    });
  });

  it("fetches public park visits through the server-side API client", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ visits: [] });

    await fetchPublicParkVisits("riisitunturi");

    expect(apiFetch).toHaveBeenCalledWith("/api/parks/riisitunturi/visits", {
      cache: "force-cache",
      next: {
        tags: [getPublicParkTag("riisitunturi")],
      },
    });
  });

  it("fetches the home summary through the cacheable API client", async () => {
    vi.mocked(apiPublicFetch).mockResolvedValueOnce(buildSummary());

    await fetchHomeSummary();

    expect(apiPublicFetch).toHaveBeenCalledWith("/api/home-summary", {
      cache: "force-cache",
      next: {
        tags: ["home-summary"],
      },
    });
  });

  it("fetches the map summary through the cacheable API client", async () => {
    vi.mocked(apiPublicFetch).mockResolvedValueOnce({
      parks: [],
      totalParks: 0,
      visitedParks: 0,
      removedParks: 0,
      updatedAt: "2024-06-15T12:00:00.000Z",
      version: 1,
    });

    await fetchMapSummary();

    expect(apiPublicFetch).toHaveBeenCalledWith("/api/map-summary", {
      cache: "force-cache",
      next: {
        tags: ["map-summary"],
      },
    });
  });
});
