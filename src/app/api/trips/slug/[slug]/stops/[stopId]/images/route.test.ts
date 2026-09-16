import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { PUBLIC_TRIP_REQUEST_TIMEOUT_MS } from "@/lib/public-trip-timeout";
import { GET } from "./route";

const { apiPublicFetchMock } = vi.hoisted(() => ({
  apiPublicFetchMock: vi.fn(),
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

describe("public trip stop images proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the requested stop image page", async () => {
    const signal = new AbortController().signal;
    vi.spyOn(AbortSignal, "timeout").mockReturnValueOnce(signal);
    apiPublicFetchMock.mockResolvedValueOnce({ images: [], nextOffset: null });
    const request = new Request(
      "http://localhost:4300/api/trips/slug/kesaretki/stops/31/images?offset=12",
    );

    const response = await GET(request, {
      params: Promise.resolve({ slug: "kesaretki", stopId: "31" }),
    });

    expect(apiPublicFetchMock).toHaveBeenCalledWith(
      "/api/trips/slug/kesaretki/stops/31/images?offset=12",
      { cache: "no-store", signal },
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ images: [], nextOffset: null });
    expect(AbortSignal.timeout).toHaveBeenCalledWith(PUBLIC_TRIP_REQUEST_TIMEOUT_MS);
  });

  it("does not cache a missing stop response", async () => {
    apiPublicFetchMock.mockRejectedValueOnce(new ApiError(404, "Not found"));

    const response = await GET(
      new Request("http://localhost:4300/api/trips/slug/kesaretki/stops/999/images"),
      { params: Promise.resolve({ slug: "kesaretki", stopId: "999" }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
