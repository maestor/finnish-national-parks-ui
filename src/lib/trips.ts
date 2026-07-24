import type { paths } from "./api-types";
import { formatFinnishDateRange } from "./fi-date";

export type Trip =
  paths["/api/trips"]["get"]["responses"][200]["content"]["application/json"]["trips"][number];

export type TripDetail =
  paths["/api/trips/{id}"]["get"]["responses"][200]["content"]["application/json"];

export type PublicTripDetail =
  paths["/api/trips/slug/{slug}"]["get"]["responses"][200]["content"]["application/json"];

export type TripItineraryItem = TripDetail["itinerary"][number];
export type PublicTripItineraryItem = PublicTripDetail["itinerary"][number];

export type TripItineraryVisitItem = Extract<TripItineraryItem, { kind: "visit" }>;
export type PublicTripItineraryVisitItem = Extract<PublicTripItineraryItem, { kind: "visit" }>;

export type TripItineraryStopItem = Extract<TripItineraryItem, { kind: "stop" }>;
export type PublicTripItineraryStopItem = Extract<PublicTripItineraryItem, { kind: "stop" }>;

export type TripStop = TripItineraryStopItem["stop"];
export type PublicTripStop = PublicTripItineraryStopItem["stop"];

export type TripLocation = NonNullable<Trip["startingPoint"]>;
export type PublicTripRoute = NonNullable<PublicTripDetail["route"]>;

export type TripCreateRequest = NonNullable<
  paths["/api/trips"]["post"]["requestBody"]
>["content"]["application/json"];

export type TripUpdateRequest = NonNullable<
  paths["/api/trips/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];

export type TripStopCreateRequest = NonNullable<
  paths["/api/trips/{id}/stops"]["post"]["requestBody"]
>["content"]["application/json"];

export type TripStopUpdateRequest = NonNullable<
  paths["/api/trip-stops/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];

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
