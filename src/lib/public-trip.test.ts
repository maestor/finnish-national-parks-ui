import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiPublicFetch } from "./api";
import { getPublicTripTag } from "./public-cache";
import {
  fetchPublicTripBySlug,
  fetchPublicTripRoute,
  fetchPublicTripStopImages,
} from "./public-trip";
import { PUBLIC_TRIP_REQUEST_TIMEOUT_MS } from "./public-trip-timeout";

vi.mock("./api", () => ({
  apiPublicFetch: vi.fn(),
}));

describe("public trip fetches", () => {
  beforeEach(() => {
    vi.mocked(apiPublicFetch).mockReset();
  });

  it("uses an extended timeout for public trip detail responses with large media payloads", async () => {
    const timeoutSignal = new AbortController().signal;
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutSignal);
    vi.mocked(apiPublicFetch).mockResolvedValueOnce({ slug: "kesaretki" });

    await fetchPublicTripBySlug("kesaretki");

    expect(apiPublicFetch).toHaveBeenCalledWith("/api/trips/slug/kesaretki", {
      cache: "force-cache",
      next: {
        tags: [getPublicTripTag("kesaretki")],
      },
      signal: timeoutSignal,
    });
    expect(timeoutSpy).toHaveBeenCalledWith(PUBLIC_TRIP_REQUEST_TIMEOUT_MS);
    timeoutSpy.mockRestore();
  });

  it("keeps a caller-provided signal for public trip detail responses", async () => {
    const controller = new AbortController();
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    vi.mocked(apiPublicFetch).mockResolvedValueOnce({ slug: "kesaretki" });

    await fetchPublicTripBySlug("kesaretki", {
      signal: controller.signal,
    });

    expect(apiPublicFetch).toHaveBeenCalledWith("/api/trips/slug/kesaretki", {
      cache: "force-cache",
      next: {
        tags: [getPublicTripTag("kesaretki")],
      },
      signal: controller.signal,
    });
    expect(timeoutSpy).not.toHaveBeenCalled();
    timeoutSpy.mockRestore();
  });

  it("fetches the calculated route separately from trip details", async () => {
    const timeoutSignal = new AbortController().signal;
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutSignal);
    vi.mocked(apiPublicFetch).mockResolvedValueOnce({ data: null, error: null, success: true });

    await fetchPublicTripRoute("kesaretki");

    expect(apiPublicFetch).toHaveBeenCalledWith("/api/trips/slug/kesaretki/route", {
      cache: "no-store",
      signal: timeoutSignal,
    });
    timeoutSpy.mockRestore();
  });

  it("fetches stop images only for the opened stop", async () => {
    const controller = new AbortController();
    vi.mocked(apiPublicFetch).mockResolvedValueOnce({ images: [], nextOffset: null });

    await fetchPublicTripStopImages("kesaretki", 31, { signal: controller.signal });

    expect(apiPublicFetch).toHaveBeenCalledWith("/api/trips/slug/kesaretki/stops/31/images", {
      cache: "no-store",
      signal: controller.signal,
    });
  });

  it("passes the next image offset when loading more stop images", async () => {
    vi.mocked(apiPublicFetch).mockResolvedValueOnce({ images: [], nextOffset: null });

    await fetchPublicTripStopImages("kesaretki", 31, { offset: 24 });

    expect(apiPublicFetch).toHaveBeenCalledWith(
      "/api/trips/slug/kesaretki/stops/31/images?offset=24",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
