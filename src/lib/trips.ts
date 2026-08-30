import type { paths } from "./api-types";
import { formatFinnishDateRange } from "./fi-date";

type GeneratedTrip =
  paths["/api/trips"]["get"]["responses"][200]["content"]["application/json"]["trips"][number];

export type Trip = Omit<GeneratedTrip, "publication"> & {
  publication?: GeneratedTrip["publication"];
};

export type TripPublication = Trip["publication"];

export type TripStorySummary =
  paths["/api/trip-stories"]["get"]["responses"][200]["content"]["application/json"]["stories"][number];

export type TripStoryListResponse =
  paths["/api/trip-stories"]["get"]["responses"][200]["content"]["application/json"];

export type UpdateTripPublicationRequest = NonNullable<
  paths["/api/trips/{id}/publication"]["patch"]["requestBody"]
>["content"]["application/json"];

type GeneratedTripDetail =
  paths["/api/trips/{id}"]["get"]["responses"][200]["content"]["application/json"];

export type TripDetail = Omit<GeneratedTripDetail, "publication"> & {
  publication?: GeneratedTripDetail["publication"];
};

export type PublicTripDetail = Omit<
  paths["/api/trips/slug/{slug}"]["get"]["responses"][200]["content"]["application/json"],
  "publication"
> & {
  publication?: GeneratedTripDetail["publication"] & {
    coverImage: TripStop["images"][number] | null;
  };
};

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
