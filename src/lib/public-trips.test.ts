import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiPublicFetch } from "./api";
import { PUBLIC_TRIPS_TAG } from "./public-cache";
import { fetchPublicTripArchive } from "./public-trips";

vi.mock("./api", () => ({
  apiPublicFetch: vi.fn(),
}));

describe("public trip archive fetches", () => {
  beforeEach(() => {
    vi.mocked(apiPublicFetch).mockReset();
  });

  it("uses the public trip cache tag for archive pages", async () => {
    vi.mocked(apiPublicFetch).mockResolvedValueOnce({ trips: [], nextCursor: null, total: 0 });

    await fetchPublicTripArchive("next-cursor");

    expect(apiPublicFetch).toHaveBeenCalledWith("/api/trips/archive?limit=12&cursor=next-cursor", {
      cache: "force-cache",
      next: {
        tags: [PUBLIC_TRIPS_TAG],
      },
    });
  });
});
