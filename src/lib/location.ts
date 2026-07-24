import type { TripPlannerResolvedLocation } from "./trip-planner";
import { fetchTripPlannerSuggestions } from "./trip-planner";

export type UserLocationStatus =
  | "idle"
  | "locating"
  | "unsupported"
  | "permissionDenied"
  | "unavailable"
  | "timeout";

export interface LocationCoordinate {
  lat: number;
  lon: number;
}

export const LOCATION_REQUEST_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 300000,
  timeout: 10000,
} as const;

export const formatCoordinateQuery = (coordinate: LocationCoordinate) =>
  `${coordinate.lat.toFixed(6)},${coordinate.lon.toFixed(6)}`;

export const buildFallbackResolvedLocation = (
  coordinate: LocationCoordinate,
): TripPlannerResolvedLocation => ({
  coordinate,
  displayName: formatCoordinateQuery(coordinate),
  label: formatCoordinateQuery(coordinate),
});

export const resolveLocationFromCoordinate = async (
  coordinate: LocationCoordinate,
): Promise<TripPlannerResolvedLocation> => {
  const fallbackLocation = buildFallbackResolvedLocation(coordinate);

  try {
    const response = await fetchTripPlannerSuggestions({
      query: fallbackLocation.label,
    });

    return response.suggestions[0] ?? fallbackLocation;
  } catch {
    return fallbackLocation;
  }
};

export const getUserLocationStatusFromError = (
  error: GeolocationPositionError,
): Exclude<UserLocationStatus, "idle" | "locating" | "unsupported"> => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "permissionDenied";
    case error.POSITION_UNAVAILABLE:
      return "unavailable";
    case error.TIMEOUT:
      return "timeout";
    default:
      return "unavailable";
  }
};
