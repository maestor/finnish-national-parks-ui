import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPublicParkTag,
  getPublicTripTag,
  HOME_SUMMARY_TAG,
  MAP_SUMMARY_TAG,
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
      body: JSON.stringify({ parkSlug: "pallas", tripSlug: "kesaretki" }),
    });
  });

  it("returns false when the revalidation request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));

    await expect(revalidatePublicCache()).resolves.toBe(false);
  });
});
