import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { PUBLIC_TRIP_VISIT_IMAGES_REQUEST_TIMEOUT_MS } from "@/lib/public-trip-timeout";
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

describe("public trip visit images route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("proxies one requested visit page with no-store cache behavior", async () => {
    const signal = new AbortController().signal;
    vi.spyOn(AbortSignal, "timeout").mockReturnValueOnce(signal);
    apiPublicFetchMock.mockResolvedValueOnce({ images: [], nextOffset: 12 });

    const response = await GET(
      new Request("http://localhost:4300/api/trips/slug/kesaretki/visits/11/images?offset=12"),
      { params: Promise.resolve({ slug: "kesaretki", visitId: "11" }) },
    );

    expect(apiPublicFetchMock).toHaveBeenCalledWith(
      "/api/trips/slug/kesaretki/visits/11/images?offset=12",
      { cache: "no-store", signal },
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ images: [], nextOffset: 12 });
    expect(AbortSignal.timeout).toHaveBeenCalledWith(PUBLIC_TRIP_VISIT_IMAGES_REQUEST_TIMEOUT_MS);
  });

  it("does not cache a missing trip visit response", async () => {
    apiPublicFetchMock.mockRejectedValueOnce(new ApiError(404, "Not found"));

    const response = await GET(
      new Request("http://localhost:4300/api/trips/slug/kesaretki/visits/999/images"),
      { params: Promise.resolve({ slug: "kesaretki", visitId: "999" }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
