import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiPublicFetch } from "@/lib/api";
import { buildPageMetadata } from "@/lib/page-metadata";
import { fetchPublicTripArchive } from "@/lib/public-trips";
import robots from "./robots";
import sitemap from "./sitemap";

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

vi.mock("@/lib/api", () => ({ apiPublicFetch: vi.fn() }));
vi.mock("@/lib/public-trips", () => ({ fetchPublicTripArchive: vi.fn() }));

describe("search discovery", () => {
  beforeEach(() => vi.resetAllMocks());

  it("advertises the sitemap on the canonical site", () => {
    expect(robots().sitemap).toBe("https://reissuvihko.example.com/sitemap.xml");
    expect(robots().rules).toMatchObject({ userAgent: "*", allow: "/" });
  });

  it("lists public parks and every archive page without media URLs or invented modification dates", async () => {
    vi.mocked(apiPublicFetch).mockResolvedValue({ parks: [{ slug: "nuuksio" }] });
    vi.mocked(fetchPublicTripArchive)
      .mockResolvedValueOnce({ trips: [archiveTrip("kesaretki")], nextCursor: "next", total: 2 })
      .mockResolvedValueOnce({ trips: [archiveTrip("syysretki")], nextCursor: null, total: 2 });
    const entries = await sitemap();
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
  });

  it("surfaces upstream failure instead of publishing an incomplete sitemap", async () => {
    vi.mocked(apiPublicFetch).mockRejectedValue(new Error("API unavailable"));
    await expect(sitemap()).rejects.toThrow("API unavailable");
  });

  it("keeps the public entry pages when there are no parks or trips", async () => {
    vi.mocked(apiPublicFetch).mockResolvedValue({ parks: [] });
    vi.mocked(fetchPublicTripArchive).mockResolvedValue({ trips: [], nextCursor: null, total: 0 });
    expect(await sitemap()).toHaveLength(5);
  });

  it("does not hide an archive failure after reading the catalogue", async () => {
    vi.mocked(apiPublicFetch).mockResolvedValue({ parks: [] });
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
