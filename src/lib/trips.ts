import type { paths } from "./api-types";
import { formatFinnishDateRange } from "./fi-date";

export type Trip =
  paths["/api/trips"]["get"]["responses"][200]["content"]["application/json"]["trips"][number];

export type TripDetail =
  paths["/api/trips/{id}"]["get"]["responses"][200]["content"]["application/json"];

export type PublicTripDetail =
  paths["/api/trips/slug/{slug}"]["get"]["responses"][200]["content"]["application/json"];

export type PublicTripVisitImagesResponse =
  paths["/api/trips/slug/{slug}/visits/{visitId}/images"]["get"]["responses"][200]["content"]["application/json"];

export type PublicTripRouteResponse =
  paths["/api/trips/slug/{slug}/route"]["get"]["responses"][200]["content"]["application/json"];

export type PublicTripStopImagesResponse =
  paths["/api/trips/slug/{slug}/stops/{stopId}/images"]["get"]["responses"][200]["content"]["application/json"];

export type TripItineraryItem = TripDetail["itinerary"][number];
export type PublicTripItineraryItem = PublicTripDetail["itinerary"][number];

export type TripItineraryVisitItem = Extract<TripItineraryItem, { kind: "visit" }>;
export type PublicTripItineraryVisitItem = Extract<PublicTripItineraryItem, { kind: "visit" }>;

export type TripItineraryStopItem = Extract<TripItineraryItem, { kind: "stop" }>;
export type PublicTripItineraryStopItem = Extract<PublicTripItineraryItem, { kind: "stop" }>;

export type TripStop = TripItineraryStopItem["stop"];
export type PublicTripStop = PublicTripItineraryStopItem["stop"];

export type TripLocation = NonNullable<Trip["startingPoint"]>;
export type PublicTripRouteStatus = PublicTripDetail["route"];
export type PublicTripRoute = NonNullable<PublicTripRouteStatus["data"]>;

export type TripCreateRequest = NonNullable<
  paths["/api/trips"]["post"]["requestBody"]
>["content"]["application/json"];

export type TripUpdateRequest = NonNullable<
  paths["/api/trips/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];

export type TripImageReference = {
  imageId: number;
  source: "visit-image" | "trip-stop-image";
};

export type TripImageCandidate =
  paths["/api/admin/trips/{id}/images"]["get"]["responses"][200]["content"]["application/json"]["images"][number];

export type TripFeaturedImageResponse =
  paths["/api/admin/trips/{id}/featured-image"]["get"]["responses"][200]["content"]["application/json"];

export type TripImageCandidatesResponse =
  paths["/api/admin/trips/{id}/images"]["get"]["responses"][200]["content"]["application/json"];

export type TripStopCreateRequest = NonNullable<
  paths["/api/trips/{id}/stops"]["post"]["requestBody"]
>["content"]["application/json"];

export type TripStopUpdateRequest = NonNullable<
  paths["/api/trip-stops/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];

type TripStopDisplayNameSource =
  | Pick<TripStop, "displayName" | "location">
  | Pick<PublicTripStop, "displayName" | "location">;

export const getTripStopDisplayName = (stop: TripStopDisplayNameSource) =>
  stop.displayName ?? stop.location.displayName;

const getTripSortTimestamp = (trip: Trip) => {
  if (trip.dateRange) {
    return new Date(trip.dateRange.end).getTime();
  }

  return new Date(trip.updatedAt).getTime();
};

export const sortTrips = (trips: Trip[]) =>
  [...trips].sort((left, right) => {
    const byDate = getTripSortTimestamp(right) - getTripSortTimestamp(left);
    if (byDate !== 0) {
      return byDate;
    }

    return left.name.localeCompare(right.name, "fi-FI");
  });

export const formatTripDateRange = (trip: Pick<Trip, "dateRange">) => {
  if (!trip.dateRange) {
    return null;
  }

  return formatFinnishDateRange(trip.dateRange.start, trip.dateRange.end);
};
