import { apiFetch } from "./api";
import type { paths } from "./api-types";

export type TripPlannerSearchRequest = NonNullable<
  paths["/api/trip-planner/search"]["post"]["requestBody"]
>["content"]["application/json"];

export type TripPlannerSearchResponse =
  paths["/api/trip-planner/search"]["post"]["responses"][200]["content"]["application/json"];

export type TripPlannerParkResult = TripPlannerSearchResponse["parks"][number];
export type TripPlannerRouteResult = TripPlannerSearchResponse["route"];
export type TripPlannerResolvedLocation = TripPlannerSearchResponse["origin"];

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
