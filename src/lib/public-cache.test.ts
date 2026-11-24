import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPublicParkTag,
  getPublicTripTag,
  HOME_SUMMARY_TAG,
  MAP_SUMMARY_TAG,
  PUBLIC_TRIPS_TAG,
  PUBLIC_VISITS_TAG,
  revalidatePublicCache,
} from "./public-cache";

describe("public cache helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds the park cache tag", () => {
    expect(HOME_SUMMARY_TAG).toBe("home-summary");
    expect(MAP_SUMMARY_TAG).toBe("map-summary");
    expect(PUBLIC_TRIPS_TAG).toBe("public-trips");
    expect(PUBLIC_VISITS_TAG).toBe("public-visits");
    expect(getPublicParkTag("pallas")).toBe("public-park:pallas");
    expect(getPublicTripTag("kesaretki")).toBe("public-trip:kesaretki");
  });

  it("posts a revalidation request with optional park and trip slugs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
    } as Response);

    await expect(
      revalidatePublicCache({ parkSlug: "pallas", tripSlug: "kesaretki" }),
    ).resolves.toBe(true);

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/revalidate-public-cache", {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expireImmediately: false, parkSlug: "pallas", tripSlug: "kesaretki" }),
    });
  });

  it("sends long park slug lists in batches accepted by the cache route", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);
    const parkSlugs = Array.from({ length: 501 }, (_, index) => `trail-${index}`);

    await expect(revalidatePublicCache({ parkSlug: "pallas", parkSlugs })).resolves.toBe(true);
    expect(fetch.mock.calls.map(([, options]) => JSON.parse(String(options?.body)))).toEqual([
      {
        expireImmediately: false,
        parkSlug: "pallas",
        parkSlugs: parkSlugs.slice(0, 500),
        tripSlug: null,
      },
      {
        expireImmediately: false,
        parkSlug: "pallas",
        parkSlugs: parkSlugs.slice(500),
        tripSlug: null,
      },
    ]);
  });

  it("reports a rejected cache revalidation request", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: false } as Response);
    await expect(revalidatePublicCache({ parkSlug: "pallas", parkSlugs: ["trail"] })).resolves.toBe(
      false,
    );
  });

  it("returns false when the revalidation request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));

    await expect(revalidatePublicCache()).resolves.toBe(false);
  });
});
