import { describe, expect, it, vi } from "vitest";
import {
  buildFallbackResolvedLocation,
  formatCoordinateQuery,
  getUserLocationStatusFromError,
  LOCATION_REQUEST_OPTIONS,
  resolveLocationFromCoordinate,
} from "./location";

const mockFetchTripPlannerSuggestions = vi.fn();

vi.mock("./trip-planner", () => ({
  fetchTripPlannerSuggestions: (...args: unknown[]) => mockFetchTripPlannerSuggestions(...args),
}));

describe("location helpers", () => {
  it("formats coordinates as a suggestion query", () => {
    expect(formatCoordinateQuery({ lat: 60.1698765, lon: 24.9384321 })).toBe("60.169877,24.938432");
    expect(LOCATION_REQUEST_OPTIONS).toEqual({
      enableHighAccuracy: false,
      maximumAge: 300000,
      timeout: 10000,
    });
  });

  it("builds a fallback resolved location from coordinates", () => {
    expect(buildFallbackResolvedLocation({ lat: 61.5, lon: 23.76 })).toEqual({
      coordinate: { lat: 61.5, lon: 23.76 },
      label: "61.500000,23.760000",
    });
  });

  it("resolves a coordinate to the first planner suggestion", async () => {
    mockFetchTripPlannerSuggestions.mockResolvedValueOnce({
      suggestions: [
        {
          coordinate: { lat: 60.17, lon: 24.94 },
          label: "Helsinki, Suomi",
        },
      ],
    });

    await expect(resolveLocationFromCoordinate({ lat: 60.17, lon: 24.94 })).resolves.toEqual({
      coordinate: { lat: 60.17, lon: 24.94 },
      label: "Helsinki, Suomi",
    });
  });

  it("falls back to the formatted coordinate when no suggestion is returned", async () => {
    mockFetchTripPlannerSuggestions.mockResolvedValueOnce({
      suggestions: [],
    });

    await expect(resolveLocationFromCoordinate({ lat: 65.0121, lon: 25.4651 })).resolves.toEqual({
      coordinate: { lat: 65.0121, lon: 25.4651 },
      label: "65.012100,25.465100",
    });
  });

  it("falls back to the formatted coordinate when suggestion lookup fails", async () => {
    mockFetchTripPlannerSuggestions.mockRejectedValueOnce(new Error("lookup failed"));

    await expect(resolveLocationFromCoordinate({ lat: 62.2426, lon: 25.7473 })).resolves.toEqual({
      coordinate: { lat: 62.2426, lon: 25.7473 },
      label: "62.242600,25.747300",
    });
  });

  it("maps geolocation errors to user-facing statuses", () => {
    expect(
      getUserLocationStatusFromError({
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        code: 1,
      } as GeolocationPositionError),
    ).toBe("permissionDenied");

    expect(
      getUserLocationStatusFromError({
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        code: 2,
      } as GeolocationPositionError),
    ).toBe("unavailable");

    expect(
      getUserLocationStatusFromError({
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        code: 3,
      } as GeolocationPositionError),
    ).toBe("timeout");

    expect(
      getUserLocationStatusFromError({
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        code: 999,
      } as GeolocationPositionError),
    ).toBe("unavailable");
  });
});
