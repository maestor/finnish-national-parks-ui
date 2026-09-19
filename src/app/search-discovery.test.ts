import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMapSummary, type MapSummary } from "@/lib/frontend-summaries";
import { buildPageMetadata } from "@/lib/page-metadata";
import { fetchPublicTripArchive } from "@/lib/public-trips";
import robots from "./robots";
import sitemap from "./sitemap";

const { connectionMock } = vi.hoisted(() => ({
  connectionMock: vi.fn(async () => undefined),
}));

const archiveTrip = (slug: string) => ({
  slug,
  id: slug === "kesaretki" ? 1 : 2,
  name: slug,
  createdAt: "2026-01-01T00:00:00Z",
  dateRange: null,
  descriptionExcerpt: null,
  featuredImage: null,
  stopCount: 0,
  visitCount: 1,
});

const createMapSummary = (slugs: string[]): MapSummary => ({
  updatedAt: null,
  version: 1,
  parks: slugs.map((slug) => ({
    address: "Suomi",
    areaKm2: null,
    boundingBox: { maxLat: 1, maxLon: 1, minLat: 0, minLon: 0 },
    category: { name: "Kansallispuisto", slug: "national-park" },
    displayTypeName: "Kansallispuisto",
    establishmentYear: null,
    hasMagnet: false,
    locationLabel: "Suomi",
    logo: null,
    map: null,
    markerPoint: { lat: 0, lon: 0 },
    name: slug,
    parkUrl: null,
    postalCode: null,
    postalOffice: null,
    slug,
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
    visitedSummary: { lastVisitedOn: null, visitCount: 0, visited: false },
  })),
});

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");

  return {
    ...actual,
    connection: connectionMock,
  };
});
vi.mock("@/lib/frontend-summaries", () => ({ fetchMapSummary: vi.fn() }));
vi.mock("@/lib/public-trips", () => ({ fetchPublicTripArchive: vi.fn() }));

describe("search discovery", () => {
  beforeEach(() => vi.resetAllMocks());

  it("advertises the sitemap on the canonical site", () => {
    expect(robots().sitemap).toBe("https://reissuvihko.example.com/sitemap.xml");
    expect(robots().rules).toMatchObject({ userAgent: "*", allow: "/" });
  });

  it("lists public parks and every archive page without media URLs or invented modification dates", async () => {
    vi.mocked(fetchMapSummary).mockResolvedValue(createMapSummary(["nuuksio"]));
    vi.mocked(fetchPublicTripArchive)
      .mockResolvedValueOnce({ trips: [archiveTrip("kesaretki")], nextCursor: "next", total: 2 })
      .mockResolvedValueOnce({ trips: [archiveTrip("syysretki")], nextCursor: null, total: 2 });
    const entries = await sitemap();
    expect(connectionMock).toHaveBeenCalledOnce();
    expect(fetchMapSummary).toHaveBeenCalledOnce();
    expect(entries.map(({ url }) => url)).toEqual([
      "https://reissuvihko.example.com/",
      "https://reissuvihko.example.com/paikat",
      "https://reissuvihko.example.com/kaynnit",
      "https://reissuvihko.example.com/retket",
      "https://reissuvihko.example.com/reissusuunnittelu",
      "https://reissuvihko.example.com/paikka/nuuksio",
      "https://reissuvihko.example.com/retki/kesaretki",
      "https://reissuvihko.example.com/retki/syysretki",
    ]);
    expect(fetchPublicTripArchive).toHaveBeenLastCalledWith("next");
    expect(entries.every((entry) => entry.lastModified === undefined)).toBe(true);
    expect(
      entries.every(({ url }) => {
        const parsedUrl = new URL(url);
        return parsedUrl.search === "" && parsedUrl.hash === "";
      }),
    ).toBe(true);
  });

  it("surfaces upstream failure instead of publishing an incomplete sitemap", async () => {
    vi.mocked(fetchMapSummary).mockRejectedValue(new Error("API unavailable"));
    await expect(sitemap()).rejects.toThrow("API unavailable");
  });

  it("keeps the public entry pages when there are no parks or trips", async () => {
    vi.mocked(fetchMapSummary).mockResolvedValue(createMapSummary([]));
    vi.mocked(fetchPublicTripArchive).mockResolvedValue({ trips: [], nextCursor: null, total: 0 });
    expect(await sitemap()).toHaveLength(5);
  });

  it("does not hide an archive failure after reading the catalogue", async () => {
    vi.mocked(fetchMapSummary).mockResolvedValue(createMapSummary([]));
    vi.mocked(fetchPublicTripArchive).mockRejectedValue(new Error("Archive unavailable"));
    await expect(sitemap()).rejects.toThrow("Archive unavailable");
  });

  it("sets a page-specific canonical alongside its social URL", () => {
    expect(
      buildPageMetadata("Nuuksio", "Reissuvihko", { pagePath: "/paikka/nuuksio" }),
    ).toMatchObject({
      alternates: { canonical: "/paikka/nuuksio" },
      openGraph: { url: "/paikka/nuuksio" },
    });
  });

  it("keeps supported UI state out of canonical and social page URLs", () => {
    const variants = [
      ["/paikat?filter=national-park&visitStatus=visited&park=pallas", "/paikat"],
      ["/paikka/pallas?visit=42#visit-history", "/paikka/pallas"],
      ["/kaynnit?view=map&year=2026&month=7", "/kaynnit"],
    ] as const;

    for (const [pagePath, canonicalPath] of variants) {
      expect(buildPageMetadata("Reissuvihko", "Reissuvihko", { pagePath })).toMatchObject({
        alternates: { canonical: canonicalPath },
        openGraph: { url: canonicalPath },
      });
    }
  });

  it("uses a concise plain-text excerpt when a trip has a long story", () => {
    const metadata = buildPageMetadata("Kesäretki", "Reissuvihko", {
      description: `Ensimmäinen päivä.\n\n${"Retkellä kansallispuistossa. ".repeat(30)}`,
    });
    expect(metadata.description?.length).toBeLessThanOrEqual(180);
    expect(metadata.description).toMatch(/^Ensimmäinen päivä\. Retkellä/);
    expect(metadata.description).toMatch(/…$/);
    expect(metadata.openGraph?.description).toBe(metadata.description);
  });
});
