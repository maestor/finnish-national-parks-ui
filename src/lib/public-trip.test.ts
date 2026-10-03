import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiAuthFetch, apiPublicFetch } from "./api";
import { getPublicTripTag } from "./public-cache";
import {
  fetchAdminTripPreview,
  fetchAdminTripPreviewRoute,
  fetchAdminTripPreviewStopImages,
  fetchAdminTripPreviewVisitImages,
  fetchPublicTripBySlug,
  fetchPublicTripRoute,
  fetchPublicTripStopImages,
} from "./public-trip";
import { PUBLIC_TRIP_REQUEST_TIMEOUT_MS } from "./public-trip-timeout";

vi.mock("./api", () => ({
  apiAuthFetch: vi.fn(),
  apiPublicFetch: vi.fn(),
}));

describe("public trip fetches", () => {
  beforeEach(() => {
    vi.mocked(apiAuthFetch).mockReset();
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

  it("loads saved trip preview content through the authenticated API", async () => {
    vi.mocked(apiAuthFetch).mockResolvedValueOnce({ slug: "kesaretki" });

    await fetchAdminTripPreview(7);

    expect(apiAuthFetch).toHaveBeenCalledWith("/api/admin/trips/7/preview", {
      cache: "no-store",
    });
  });

  it("uses an abort timeout for preview routes and preserves a caller signal", async () => {
    const timeoutSignal = new AbortController().signal;
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutSignal);
    const callerSignal = new AbortController().signal;
    vi.mocked(apiAuthFetch).mockResolvedValue({ data: null, error: null, success: true });

    await fetchAdminTripPreviewRoute(7);
    await fetchAdminTripPreviewRoute(7, { signal: callerSignal });

    expect(timeoutSpy).toHaveBeenCalledWith(PUBLIC_TRIP_REQUEST_TIMEOUT_MS);
    expect(apiAuthFetch).toHaveBeenNthCalledWith(
      1,
      "/api/admin/trips/7/preview/route",
      expect.objectContaining({ signal: timeoutSignal }),
    );
    expect(apiAuthFetch).toHaveBeenNthCalledWith(
      2,
      "/api/admin/trips/7/preview/route",
      expect.objectContaining({ signal: callerSignal }),
    );
    timeoutSpy.mockRestore();
  });

  it("loads preview visit and stop image pages with offsets and caller signals", async () => {
    const callerSignal = new AbortController().signal;
    const timeoutSignal = new AbortController().signal;
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutSignal);
    vi.mocked(apiAuthFetch).mockResolvedValue({ images: [], nextOffset: null });

    await fetchAdminTripPreviewVisitImages(7, 19);
    await fetchAdminTripPreviewVisitImages(7, 19, { offset: 12, signal: callerSignal });
    await fetchAdminTripPreviewStopImages(7, 23);
    await fetchAdminTripPreviewStopImages(7, 23, { offset: 24, signal: callerSignal });

    expect(apiAuthFetch).toHaveBeenNthCalledWith(
      1,
      "/api/admin/trips/7/preview/visits/19/images?limit=12&offset=0",
      expect.objectContaining({ cache: "no-store", signal: timeoutSignal }),
    );
    expect(apiAuthFetch).toHaveBeenNthCalledWith(
      2,
      "/api/admin/trips/7/preview/visits/19/images?limit=12&offset=12",
      expect.objectContaining({ cache: "no-store", signal: callerSignal }),
    );
    expect(apiAuthFetch).toHaveBeenNthCalledWith(
      3,
      "/api/admin/trips/7/preview/stops/23/images?limit=12&offset=0",
      expect.objectContaining({ cache: "no-store", signal: timeoutSignal }),
    );
    expect(apiAuthFetch).toHaveBeenNthCalledWith(
      4,
      "/api/admin/trips/7/preview/stops/23/images?limit=12&offset=24",
      expect.objectContaining({ cache: "no-store", signal: callerSignal }),
    );
    expect(timeoutSpy).toHaveBeenCalledTimes(2);
    timeoutSpy.mockRestore();
  });
});
