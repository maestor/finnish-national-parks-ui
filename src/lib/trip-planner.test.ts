import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRIP_PLANNER_REQUEST_TIMEOUT_MS } from "./trip-planner-timeout";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("./api", () => ({
  apiFetch: apiFetchMock,
}));

import {
  fetchTripPlannerSuggestions,
  searchTripPlanner,
  searchTripPlannerNearby,
} from "./trip-planner";

describe("trip planner api helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses an extended timeout for routed searches", async () => {
    const timeoutSignal = new AbortController().signal;
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutSignal);
    const response = { parks: [] };
    apiFetchMock.mockResolvedValueOnce(response);

    await expect(
      searchTripPlanner({
        destinationQuery: "Rovaniemi",
        originQuery: "Helsinki",
      }),
    ).resolves.toBe(response);

    expect(timeoutSpy).toHaveBeenCalledWith(TRIP_PLANNER_REQUEST_TIMEOUT_MS);
    expect(apiFetchMock).toHaveBeenCalledWith("/api/trip-planner/search", {
      method: "POST",
      body: JSON.stringify({
        destinationQuery: "Rovaniemi",
        originQuery: "Helsinki",
        mode: "drive",
      }),
      signal: timeoutSignal,
    });
  });

  it("uses an extended timeout for nearby planner searches", async () => {
    const timeoutSignal = new AbortController().signal;
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutSignal);
    const response = { parks: [] };
    apiFetchMock.mockResolvedValueOnce(response);

    await expect(
      searchTripPlannerNearby({
        maxDistanceKm: 25,
        originQuery: "Helsinki",
      }),
    ).resolves.toBe(response);

    expect(timeoutSpy).toHaveBeenCalledWith(TRIP_PLANNER_REQUEST_TIMEOUT_MS);
    expect(apiFetchMock).toHaveBeenCalledWith("/api/trip-planner/nearby", {
      method: "POST",
      body: JSON.stringify({
        maxDistanceKm: 25,
        originQuery: "Helsinki",
      }),
      signal: timeoutSignal,
    });
  });

  it("keeps a caller-provided signal for suggestions", async () => {
    const controller = new AbortController();
    const response = { suggestions: [] };
    apiFetchMock.mockResolvedValueOnce(response);

    await expect(
      fetchTripPlannerSuggestions({ query: "Helsinki" }, controller.signal),
    ).resolves.toBe(response);

    expect(apiFetchMock).toHaveBeenCalledWith("/api/trip-planner/suggestions", {
      method: "POST",
      body: JSON.stringify({ query: "Helsinki" }),
      signal: controller.signal,
    });
  });
});
