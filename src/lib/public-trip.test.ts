import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiPublicFetch } from "./api";
import { fetchPublicTripBySlug } from "./public-trip";
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
      cache: "no-store",
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
      cache: "no-store",
      signal: controller.signal,
    });
    expect(timeoutSpy).not.toHaveBeenCalled();
    timeoutSpy.mockRestore();
  });
});
