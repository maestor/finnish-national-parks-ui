import type { ParkCategorySlug, ParkTypeSlug } from "./parks";

export type TrailTypeSlug = Extract<
  ParkTypeSlug,
  "walking-trail" | "nature-trail" | "hiking-trail"
>;

export type HikingAndWildernessAreaTypeSlug = Extract<
  ParkTypeSlug,
  "hiking-area" | "wilderness-area"
>;

type GroupedParkTypeSlug = TrailTypeSlug | HikingAndWildernessAreaTypeSlug;

export type FilterableParkTypeSlug = Exclude<ParkTypeSlug, GroupedParkTypeSlug>;

export type ParkTypeFilterLabelKey =
  | "nationalParks"
  | "otherNatureReserves"
  | "outdoorRecreationAreas"
  | "factoryVillages";

export const TRAILS_AND_ROUTES_CATEGORY_SLUG: ParkCategorySlug = "trails-and-routes";
export const HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG: ParkCategorySlug =
  "hiking-and-wilderness-areas";

const HIKING_AND_WILDERNESS_AREA_TYPE_SLUGS = ["hiking-area", "wilderness-area"] as const;

export const PARK_FILTER_ORDER = [
  "national-park",
  HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG,
  "nature-reserve-area",
  "outdoor-recreation-area",
  "factory-village",
  TRAILS_AND_ROUTES_CATEGORY_SLUG,
] as const satisfies readonly string[];

export const PARK_TYPE_FILTER_LABEL_KEYS: Record<FilterableParkTypeSlug, ParkTypeFilterLabelKey> = {
  "national-park": "nationalParks",
  "nature-reserve-area": "otherNatureReserves",
  "outdoor-recreation-area": "outdoorRecreationAreas",
  "factory-village": "factoryVillages",
};

export const isHikingAndWildernessAreaTypeSlug = (
  slug: string,
): slug is HikingAndWildernessAreaTypeSlug =>
  HIKING_AND_WILDERNESS_AREA_TYPE_SLUGS.some((typeSlug) => typeSlug === slug);

export const getParkFilterSortIndex = (slug: string) => {
  const sortIndex = (PARK_FILTER_ORDER as readonly string[]).indexOf(slug);

  return sortIndex === -1 ? PARK_FILTER_ORDER.length : sortIndex;
};
