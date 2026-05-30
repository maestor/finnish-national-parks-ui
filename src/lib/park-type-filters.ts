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
  "state-hiking-area",
  "wilderness-area",
  "other-nature-reserve",
  "outdoor-recreation-area",
  "nature-trail",
  "hiking-trail",
];

export const PARK_TYPE_FILTER_LABEL_KEYS: Record<FilterableParkTypeSlug, ParkTypeFilterLabelKey> = {
  "national-park": "nationalParks",
  "state-hiking-area": "hikingAreas",
  "wilderness-area": "wildernessAreas",
  "other-nature-reserve": "otherNatureReserves",
  "outdoor-recreation-area": "outdoorRecreationAreas",
  "nature-trail": "natureTrails",
};

export const getParkTypeFilterSortIndex = (slug: ParkTypeSlug) => {
  const sortIndex = PARK_TYPE_FILTER_ORDER.indexOf(slug);

  return sortIndex === -1 ? PARK_TYPE_FILTER_ORDER.length : sortIndex;
};
