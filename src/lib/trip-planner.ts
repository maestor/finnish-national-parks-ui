import { apiFetch } from "./api";
import type { paths } from "./api-types";

export type TripPlannerSuggestionsRequest = NonNullable<
  paths["/api/trip-planner/suggestions"]["post"]["requestBody"]
>["content"]["application/json"];

export type TripPlannerSuggestionsResponse =
  paths["/api/trip-planner/suggestions"]["post"]["responses"][200]["content"]["application/json"];

export type TripPlannerSearchRequest = NonNullable<
  paths["/api/trip-planner/search"]["post"]["requestBody"]
>["content"]["application/json"];

export type TripPlannerSearchResponse =
  paths["/api/trip-planner/search"]["post"]["responses"][200]["content"]["application/json"];

export type TripPlannerNearbyRequest = NonNullable<
  paths["/api/trip-planner/nearby"]["post"]["requestBody"]
>["content"]["application/json"];

export type TripPlannerNearbyResponse =
  paths["/api/trip-planner/nearby"]["post"]["responses"][200]["content"]["application/json"];

export type TripPlannerSearchParkResult = TripPlannerSearchResponse["parks"][number];
export type TripPlannerNearbyParkResult = TripPlannerNearbyResponse["parks"][number];
export type TripPlannerRouteResult = TripPlannerSearchResponse["route"];
export type TripPlannerResolvedLocation = TripPlannerSearchResponse["origin"];
export type TripPlannerSearchAreaResult = TripPlannerNearbyResponse["searchArea"];
export type TripPlannerSuggestion = TripPlannerSuggestionsResponse["suggestions"][number];
export type TripPlannerUiParkResult = Omit<TripPlannerSearchParkResult, "distanceFromRouteKm"> & {
  distanceKm: number;
};
export type TripPlannerUiResult =
  | {
      destination: TripPlannerResolvedLocation;
      mode: "route";
      origin: TripPlannerResolvedLocation;
      parks: TripPlannerUiParkResult[];
      route: TripPlannerRouteResult;
      searchArea: null;
    }
  | {
      destination: null;
      mode: "nearby";
      origin: TripPlannerResolvedLocation;
      parks: TripPlannerUiParkResult[];
      route: null;
      searchArea: TripPlannerSearchAreaResult;
    };

export const fetchTripPlannerSuggestions = async (
  request: TripPlannerSuggestionsRequest,
  signal?: AbortSignal,
): Promise<TripPlannerSuggestionsResponse> =>
  apiFetch<TripPlannerSuggestionsResponse>("/api/trip-planner/suggestions", {
    method: "POST",
    body: JSON.stringify(request),
    signal,
  });

export const searchTripPlanner = async (
  request: Omit<TripPlannerSearchRequest, "mode">,
): Promise<TripPlannerSearchResponse> =>
  apiFetch<TripPlannerSearchResponse>("/api/trip-planner/search", {
    method: "POST",
    body: JSON.stringify({
      ...request,
      mode: "drive",
    } satisfies TripPlannerSearchRequest),
  });

export const searchTripPlannerNearby = async (
  request: TripPlannerNearbyRequest,
): Promise<TripPlannerNearbyResponse> =>
  apiFetch<TripPlannerNearbyResponse>("/api/trip-planner/nearby", {
    method: "POST",
    body: JSON.stringify(request),
  });

const toUiParkResult = (
  park: TripPlannerSearchParkResult | TripPlannerNearbyParkResult,
): TripPlannerUiParkResult => {
  if ("distanceFromRouteKm" in park) {
    const { distanceFromRouteKm, ...rest } = park;

    return {
      ...rest,
      distanceKm: distanceFromRouteKm,
    };
  }

  const { distanceFromOriginKm, ...rest } = park;

  return {
    ...rest,
    distanceKm: distanceFromOriginKm,
  };
};

export const normalizeTripPlannerSearchResponse = (
  response: TripPlannerSearchResponse,
): TripPlannerUiResult => ({
  destination: response.destination,
  mode: "route",
  origin: response.origin,
  parks: response.parks.map(toUiParkResult),
  route: response.route,
  searchArea: null,
});

export const normalizeTripPlannerNearbyResponse = (
  response: TripPlannerNearbyResponse,
): TripPlannerUiResult => ({
  destination: null,
  mode: "nearby",
  origin: response.origin,
  parks: response.parks.map(toUiParkResult),
  route: null,
  searchArea: response.searchArea,
});
