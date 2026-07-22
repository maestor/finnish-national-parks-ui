import type { paths } from "./api-types";

export type Trip =
  paths["/api/trips"]["get"]["responses"][200]["content"]["application/json"]["trips"][number];

export type TripCreateRequest = NonNullable<
  paths["/api/trips"]["post"]["requestBody"]
>["content"]["application/json"];

export type TripUpdateRequest = NonNullable<
  paths["/api/trips/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];

const DATE_FORMATTER = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
  timeZone: "Europe/Helsinki",
});

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

  const start = DATE_FORMATTER.format(new Date(trip.dateRange.start));
  const end = DATE_FORMATTER.format(new Date(trip.dateRange.end));

  return start === end ? start : `${start} - ${end}`;
};
