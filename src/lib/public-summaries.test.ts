import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api";
import type { PublicHomeSummary } from "./public-summaries";
import {
  createHomeLatestVisitEntriesFromSummary,
  createHomeProgressItems,
  createHomeRecentVisitsFromSummary,
  fetchPublicParkDetail,
  fetchPublicParkVisits,
} from "./public-summaries";

vi.mock("./api", () => ({
  apiFetch: vi.fn(),
  apiPublicFetch: vi.fn(),
}));

const buildSummary = (): PublicHomeSummary => ({
  totalVisits: 12,
  uniqueVisitedParks: 5,
  progressByType: [
    {
      type: {
        code: 6,
        id: 6,
        name: "Luontopolut",
        slug: "nature-trail",
      },
      visitedParks: 1,
      totalParks: 7,
      totalVisits: 1,
    },
    {
      type: {
        code: 4,
        id: 4,
        name: "Muut LS-alueet",
        slug: "other-nature-reserve",
      },
      visitedParks: 2,
      totalParks: 4,
      totalVisits: 3,
    },
    {
      type: {
        code: 1,
        id: 1,
        name: "Kansallispuistot",
        slug: "national-park",
      },
      visitedParks: 3,
      totalParks: 8,
      totalVisits: 6,
    },
    {
      type: {
        code: 5,
        id: 5,
        name: "Virkistysalueet",
        slug: "outdoor-recreation-area",
      },
      visitedParks: 0,
      totalParks: 2,
      totalVisits: 0,
    },
    {
      type: {
        code: 3,
        id: 3,
        name: "Erämaa-alueet",
        slug: "wilderness-area",
      },
      visitedParks: 1,
      totalParks: 6,
      totalVisits: 1,
    },
    {
      type: {
        code: 2,
        id: 2,
        name: "Retkeilyalueet",
        slug: "state-hiking-area",
      },
      visitedParks: 1,
      totalParks: 3,
      totalVisits: 1,
    },
  ],
  mostVisitedParks: [],
  recentVisits: [],
  latestVisitEntries: [],
  updatedAt: "2024-06-15T12:00:00.000Z",
  version: 1,
});

describe("createHomeProgressItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("orders park type progress items to match the map filters", () => {
    const progressItems = createHomeProgressItems(buildSummary(), "Kaikki paikat");

    expect(progressItems.map((item) => item.label)).toEqual([
      "Kaikki paikat",
      "Kansallispuistot",
      "Retkeilyalueet",
      "Erämaa-alueet",
      "Muut LS-alueet",
      "Virkistysalueet",
      "Luontopolut",
    ]);
  });

  it("sorts latest visit entries from the public summary by newest creation time", () => {
    const summary = buildSummary();
    summary.latestVisitEntries = [
      {
        id: 2,
        createdAt: "2024-06-15T10:00:00.000Z",
        updatedAt: "2024-06-15T10:00:00.000Z",
        visitedOn: "2024-06-15",
        park: {
          name: "Nuuksio",
          slug: "nuuksio",
        },
      },
      {
        id: 5,
        createdAt: "2024-06-16T10:00:00.000Z",
        updatedAt: "2024-06-16T10:00:00.000Z",
        visitedOn: "2024-06-16",
        park: {
          name: "Pallas",
          slug: "pallas",
        },
      },
      {
        id: 4,
        createdAt: "2024-06-16T10:00:00.000Z",
        updatedAt: "2024-06-16T10:00:00.000Z",
        visitedOn: "2024-06-16",
        park: {
          name: "Oulanka",
          slug: "oulanka",
        },
      },
      {
        id: 1,
        createdAt: "2024-06-14T10:00:00.000Z",
        updatedAt: "2024-06-14T10:00:00.000Z",
        visitedOn: "2024-06-14",
        park: {
          name: "Riisitunturi",
          slug: "riisitunturi",
        },
      },
    ];

    const latestVisitEntries = createHomeLatestVisitEntriesFromSummary(summary);

    expect(latestVisitEntries.map((visit) => visit.parkSlug)).toEqual([
      "pallas",
      "oulanka",
      "nuuksio",
      "riisitunturi",
    ]);
  });

  it("limits public recent visits to the first five items", () => {
    const summary = buildSummary();
    summary.recentVisits = Array.from({ length: 7 }, (_, index) => ({
      park: {
        name: `Park ${index + 1}`,
        slug: `park-${index + 1}`,
      },
      visitedSummary: {
        lastVisitedOn: `2024-06-${String(index + 10).padStart(2, "0")}`,
        visitCount: index + 1,
        visited: true,
      },
    }));

    const recentVisits = createHomeRecentVisitsFromSummary(summary);

    expect(recentVisits).toHaveLength(5);
    expect(recentVisits.map((visit) => visit.parkSlug)).toEqual([
      "park-1",
      "park-2",
      "park-3",
      "park-4",
      "park-5",
    ]);
  });

  it("fetches public park detail through the server-side API client", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ slug: "riisitunturi" });

    await fetchPublicParkDetail("riisitunturi", { includeBoundary: true });

    expect(apiFetch).toHaveBeenCalledWith("/api/parks/riisitunturi?includeBoundary=true", {
      cache: "force-cache",
      next: {
        tags: ["public-park:riisitunturi"],
      },
    });
  });

  it("fetches public park visits through the server-side API client", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ visits: [] });

    await fetchPublicParkVisits("riisitunturi");

    expect(apiFetch).toHaveBeenCalledWith("/api/parks/riisitunturi/visits", {
      cache: "force-cache",
      next: {
        tags: ["public-park:riisitunturi"],
      },
    });
  });
});
