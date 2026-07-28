import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiPublicFetch } from "./api";
import { fetchPublicTripBySlug } from "./public-trip";

vi.mock("./api", () => ({
  apiPublicFetch: vi.fn(),
}));

describe("public trip fetches", () => {
  beforeEach(() => {
    vi.mocked(apiPublicFetch).mockReset();
  });

  it("avoids caching public trip detail responses that include presigned image URLs", async () => {
    vi.mocked(apiPublicFetch).mockResolvedValueOnce({ slug: "kesaretki" });

    await fetchPublicTripBySlug("kesaretki");

    expect(apiPublicFetch).toHaveBeenCalledWith("/api/trips/slug/kesaretki", {
      cache: "no-store",
    });
  });
});
