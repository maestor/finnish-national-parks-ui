import type { ParkCategorySlug, ParkTypeSlug } from "./parks";

export type TrailTypeSlug = Extract<
  ParkTypeSlug,
  "walking-trail" | "nature-trail" | "hiking-trail"
>;

export type FilterableParkTypeSlug = Exclude<ParkTypeSlug, TrailTypeSlug>;

export type ParkTypeFilterLabelKey =
  | "nationalParks"
  | "hikingAreas"
  | "wildernessAreas"
  | "otherNatureReserves"
  | "outdoorRecreationAreas"
  | "factoryVillages";

export const TRAILS_AND_ROUTES_CATEGORY_SLUG: ParkCategorySlug = "trails-and-routes";

export const PARK_TYPE_FILTER_ORDER: ParkTypeSlug[] = [
  "national-park",
  "hiking-area",
  "wilderness-area",
  "nature-reserve-area",
  "outdoor-recreation-area",
  "factory-village",
  "walking-trail",
  "nature-trail",
  "hiking-trail",
];

export const PARK_TYPE_FILTER_LABEL_KEYS: Record<FilterableParkTypeSlug, ParkTypeFilterLabelKey> = {
  "national-park": "nationalParks",
  "hiking-area": "hikingAreas",
  "wilderness-area": "wildernessAreas",
  "nature-reserve-area": "otherNatureReserves",
  "outdoor-recreation-area": "outdoorRecreationAreas",
  "factory-village": "factoryVillages",
};

export const getParkTypeFilterSortIndex = (slug: ParkTypeSlug) => {
  const sortIndex = PARK_TYPE_FILTER_ORDER.indexOf(slug);

  return sortIndex === -1 ? PARK_TYPE_FILTER_ORDER.length : sortIndex;
};
