import type { MapPark } from "./parks";

export type ParkTypeSlug = MapPark["type"]["slug"];

export type FilterableParkTypeSlug = Exclude<ParkTypeSlug, "hiking-trail">;

export type ParkTypeFilterLabelKey =
  | "nationalParks"
  | "hikingAreas"
  | "wildernessAreas"
  | "otherNatureReserves"
  | "outdoorRecreationAreas"
  | "natureTrails";

export const TRAIL_TYPE_SLUGS: ParkTypeSlug[] = ["nature-trail", "hiking-trail"];

export const PARK_TYPE_FILTER_ORDER: ParkTypeSlug[] = [
  "national-park",
  "hiking-area",
  "wilderness-area",
  "nature-reserve-area",
  "outdoor-recreation-area",
  "nature-trail",
  "hiking-trail",
];

export const PARK_TYPE_FILTER_LABEL_KEYS: Record<FilterableParkTypeSlug, ParkTypeFilterLabelKey> = {
  "national-park": "nationalParks",
  "hiking-area": "hikingAreas",
  "wilderness-area": "wildernessAreas",
  "nature-reserve-area": "otherNatureReserves",
  "outdoor-recreation-area": "outdoorRecreationAreas",
  "nature-trail": "natureTrails",
};

export const getParkTypeFilterSortIndex = (slug: ParkTypeSlug) => {
  const sortIndex = PARK_TYPE_FILTER_ORDER.indexOf(slug);

  return sortIndex === -1 ? PARK_TYPE_FILTER_ORDER.length : sortIndex;
};
