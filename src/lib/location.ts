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

export interface CoordinateInputValue {
  lat: string;
  lon: string;
}

export type ParsedCoordinateInput =
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "value"; value: LocationCoordinate };

export const LOCATION_REQUEST_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 300000,
  timeout: 10000,
} as const;

export const formatCoordinateQuery = (coordinate: LocationCoordinate) =>
  `${coordinate.lat.toFixed(6)},${coordinate.lon.toFixed(6)}`;

export const formatCoordinateInputValue = (
  coordinate: LocationCoordinate | null,
): CoordinateInputValue => ({
  lat: coordinate === null ? "" : String(coordinate.lat),
  lon: coordinate === null ? "" : String(coordinate.lon),
});

export const parseOptionalCoordinateInput = (
  coordinate: CoordinateInputValue,
): ParsedCoordinateInput => {
  const lat = coordinate.lat.trim();
  const lon = coordinate.lon.trim();

  if (lat === "" && lon === "") {
    return { kind: "empty" };
  }

  const parsedLat = Number(lat);
  const parsedLon = Number(lon);

  if (
    lat === "" ||
    lon === "" ||
    Number.isFinite(parsedLat) === false ||
    Number.isFinite(parsedLon) === false
  ) {
    return { kind: "invalid" };
  }

  return {
    kind: "value",
    value: {
      lat: parsedLat,
      lon: parsedLon,
    },
  };
};

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
