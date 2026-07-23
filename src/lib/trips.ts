import type { paths } from "./api-types";
import { formatFinnishDateRange } from "./fi-date";

export type Trip =
  paths["/api/trips"]["get"]["responses"][200]["content"]["application/json"]["trips"][number];

export type TripCreateRequest = NonNullable<
  paths["/api/trips"]["post"]["requestBody"]
>["content"]["application/json"];

export type TripUpdateRequest = NonNullable<
  paths["/api/trips/{id}"]["patch"]["requestBody"]
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

export const formatTripDateRange = (trip: Trip) => {
  if (!trip.dateRange) {
    return null;
  }

  return formatFinnishDateRange(trip.dateRange.start, trip.dateRange.end);
};
