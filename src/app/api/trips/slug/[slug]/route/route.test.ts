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

describe("public trip route proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads a route with no-store cache behavior", async () => {
    const signal = new AbortController().signal;
    vi.spyOn(AbortSignal, "timeout").mockReturnValueOnce(signal);
    apiPublicFetchMock.mockResolvedValueOnce({ data: null, error: null, success: true });

    const response = await GET(
      new Request("http://localhost:4300/api/trips/slug/kesaretki/route"),
      {
        params: Promise.resolve({ slug: "kesaretki" }),
      },
    );

    expect(apiPublicFetchMock).toHaveBeenCalledWith("/api/trips/slug/kesaretki/route", {
      cache: "no-store",
      signal,
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ data: null, error: null, success: true });
    expect(AbortSignal.timeout).toHaveBeenCalledWith(PUBLIC_TRIP_REQUEST_TIMEOUT_MS);
  });

  it("does not cache a missing trip response", async () => {
    apiPublicFetchMock.mockRejectedValueOnce(new ApiError(404, "Not found"));

    const response = await GET(new Request("http://localhost:4300/api/trips/slug/missing/route"), {
      params: Promise.resolve({ slug: "missing" }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
