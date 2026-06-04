import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, apiPublicFetch } from "./api";
import type { PublicHomeSummary } from "./public-summaries";
import {
  createHomeLatestVisitEntriesFromSummary,
  createHomeLatestVisitEntriesFromVisitList,
  createHomeMostVisitedParks,
  createHomeProgressItems,
  createHomeRecentVisitsFromSummary,
  createHomeRecentVisitsFromVisitList,
  fetchPublicHomeSummary,
  fetchPublicMapSummary,
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
  seasonalVisitCounts: {
    spring: 3,
    summer: 4,
    autumn: 3,
    winter: 2,
  },
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
        slug: "nature-reserve-area",
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
        code: 8,
        id: 8,
        name: "Tehdaskylät",
        slug: "factory-village",
      },
      visitedParks: 1,
      totalParks: 1,
      totalVisits: 2,
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
        slug: "hiking-area",
      },
      visitedParks: 1,
      totalParks: 3,
      totalVisits: 1,
    },
    {
      type: {
        code: 7,
        id: 7,
        name: "Vaellusreitit",
        slug: "hiking-trail",
      },
      visitedParks: 1,
      totalParks: 5,
      totalVisits: 2,
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
      "Tehdaskylät",
      "Luontopolut",
      "Vaellusreitit",
    ]);
    expect(progressItems[0]?.mapFilter).toBe("visited");
    expect(progressItems[1]?.mapFilter).toBe("national-park");
    expect(progressItems[2]?.mapFilter).toBe("hiking-area");
    expect(progressItems[6]?.mapFilter).toBe("factory-village");
    expect(progressItems[7]?.mapFilter).toBe("nature-trail");
    expect(progressItems[8]?.mapFilter).toBe("hiking-trail");
  });

  it("returns no progress items when the summary has no park-type progress", () => {
    const summary = buildSummary();
    summary.progressByType = [];

    expect(createHomeProgressItems(summary, "Kaikki paikat")).toEqual([]);
  });

  it("maps most-visited parks to home card items", () => {
    const summary = buildSummary();
    summary.mostVisitedParks = [
      {
        park: {
          name: "Pallas",
          slug: "pallas",
        },
        lastVisitedOn: "2024-06-16",
        visitCount: 3,
      },
    ];

    expect(createHomeMostVisitedParks(summary)).toEqual([
      {
        parkName: "Pallas",
        parkSlug: "pallas",
        visitCount: 3,
      },
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

  it("limits public recent visits to the first ten items", () => {
    const summary = buildSummary();
    summary.recentVisits = Array.from({ length: 12 }, (_, index) => ({
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

    expect(recentVisits).toHaveLength(10);
    expect(recentVisits.map((visit) => visit.parkSlug)).toEqual([
      "park-1",
      "park-2",
      "park-3",
      "park-4",
      "park-5",
      "park-6",
      "park-7",
      "park-8",
      "park-9",
      "park-10",
    ]);
  });

  it("sorts recent visits from the visit list by newest visited date", () => {
    expect(
      createHomeRecentVisitsFromVisitList([
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
          id: 1,
          createdAt: "2024-06-14T10:00:00.000Z",
          updatedAt: "2024-06-14T10:00:00.000Z",
          visitedOn: "2024-06-16",
          park: {
            name: "Pallas",
            slug: "pallas",
          },
        },
      ] as never),
    ).toEqual([
      {
        id: 1,
        parkName: "Pallas",
        parkSlug: "pallas",
        visitedOn: "2024-06-16",
      },
      {
        id: 2,
        parkName: "Nuuksio",
        parkSlug: "nuuksio",
        visitedOn: "2024-06-15",
      },
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

  it("sorts latest visit entries from the visit list by newest creation time", () => {
    expect(
      createHomeLatestVisitEntriesFromVisitList([
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
          id: 1,
          createdAt: "2024-06-16T10:00:00.000Z",
          updatedAt: "2024-06-16T10:00:00.000Z",
          visitedOn: "2024-06-14",
          park: {
            name: "Pallas",
            slug: "pallas",
          },
        },
      ] as never),
    ).toEqual([
      {
        id: 1,
        parkName: "Pallas",
        parkSlug: "pallas",
        createdAt: "2024-06-16T10:00:00.000Z",
      },
      {
        id: 2,
        parkName: "Nuuksio",
        parkSlug: "nuuksio",
        createdAt: "2024-06-15T10:00:00.000Z",
      },
    ]);
  });

  it("fetches the public home summary through the cacheable API client", async () => {
    vi.mocked(apiPublicFetch).mockResolvedValueOnce(buildSummary());

    await fetchPublicHomeSummary();

    expect(apiPublicFetch).toHaveBeenCalledWith("/api/public/home-summary", {
      cache: "force-cache",
      next: {
        tags: ["public-home-summary"],
      },
    });
  });

  it("fetches the public map summary through the cacheable API client", async () => {
    vi.mocked(apiPublicFetch).mockResolvedValueOnce({
      parks: [],
      totalParks: 0,
      visitedParks: 0,
      removedParks: 0,
      updatedAt: "2024-06-15T12:00:00.000Z",
      version: 1,
    });

    await fetchPublicMapSummary();

    expect(apiPublicFetch).toHaveBeenCalledWith("/api/public/map-summary", {
      cache: "force-cache",
      next: {
        tags: ["public-map-summary"],
      },
    });
  });
});
