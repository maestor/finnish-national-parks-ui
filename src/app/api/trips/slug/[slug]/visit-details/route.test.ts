import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { ParkVisits } from "@/lib/parks";
import { PUBLIC_TRIP_VISIT_DETAILS_REQUEST_TIMEOUT_MS } from "@/lib/public-trip-timeout";
import { GET } from "./route";

const {
  apiPublicFetchMock,
  buildPublicTripVisitDetailsResponseMock,
  collectTripVisitDetailTargetsMock,
  fetchPublicTripBySlugMock,
} = vi.hoisted(() => ({
  apiPublicFetchMock: vi.fn(),
  buildPublicTripVisitDetailsResponseMock: vi.fn(),
  collectTripVisitDetailTargetsMock: vi.fn(),
  fetchPublicTripBySlugMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = "ApiError";
    }
  },
  apiPublicFetch: apiPublicFetchMock,
}));

vi.mock("@/lib/public-trip", () => ({
  fetchPublicTripBySlug: fetchPublicTripBySlugMock,
}));

vi.mock("@/lib/public-trip-visit-details", () => ({
  buildPublicTripVisitDetailsResponse: buildPublicTripVisitDetailsResponseMock,
  collectTripVisitDetailTargets: collectTripVisitDetailTargetsMock,
}));

describe("trip visit details route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses an extended timeout and never stores signed gallery URLs", async () => {
    const firstSignal = new AbortController().signal;
    const secondSignal = new AbortController().signal;
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValueOnce(firstSignal)
      .mockReturnValueOnce(secondSignal);
    const parkVisits: ParkVisits["visits"] = [];

    fetchPublicTripBySlugMock.mockResolvedValueOnce({ slug: "kesaretki" });
    collectTripVisitDetailTargetsMock.mockReturnValueOnce(
      new Map([
        ["nuuksio", [11]],
        ["pallas-yllastunturi", [12]],
      ]),
    );
    apiPublicFetchMock
      .mockResolvedValueOnce({ visits: parkVisits })
      .mockResolvedValueOnce({ visits: parkVisits });
    buildPublicTripVisitDetailsResponseMock.mockReturnValueOnce({
      visits: {
        "11": { images: [] },
        "12": { images: [] },
      },
    });

    const response = await GET(new Request("http://localhost:4300/api/trips/slug/kesaretki"), {
      params: Promise.resolve({ slug: "kesaretki" }),
    });

    expect(timeoutSpy).toHaveBeenNthCalledWith(1, PUBLIC_TRIP_VISIT_DETAILS_REQUEST_TIMEOUT_MS);
    expect(timeoutSpy).toHaveBeenNthCalledWith(2, PUBLIC_TRIP_VISIT_DETAILS_REQUEST_TIMEOUT_MS);
    expect(apiPublicFetchMock).toHaveBeenNthCalledWith(1, "/api/parks/nuuksio/visits", {
      cache: "no-store",
      signal: firstSignal,
    });
    expect(apiPublicFetchMock).toHaveBeenNthCalledWith(2, "/api/parks/pallas-yllastunturi/visits", {
      cache: "no-store",
      signal: secondSignal,
    });
    await expect(response.json()).resolves.toEqual({
      visits: {
        "11": { images: [] },
        "12": { images: [] },
      },
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("does not store the empty gallery response", async () => {
    fetchPublicTripBySlugMock.mockResolvedValueOnce({ slug: "kesaretki" });
    collectTripVisitDetailTargetsMock.mockReturnValueOnce(new Map());

    const response = await GET(new Request("http://localhost:4300/api/trips/slug/kesaretki"), {
      params: Promise.resolve({ slug: "kesaretki" }),
    });

    await expect(response.json()).resolves.toEqual({ visits: {} });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("does not store a missing trip response", async () => {
    fetchPublicTripBySlugMock.mockRejectedValueOnce(new ApiError(404, "Not found"));

    const response = await GET(new Request("http://localhost:4300/api/trips/slug/puuttuu"), {
      params: Promise.resolve({ slug: "puuttuu" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found" });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
