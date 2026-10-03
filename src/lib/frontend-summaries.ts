import { apiFetch, apiPublicFetch } from "./api";
import type { paths } from "./api-types";
import {
  getParkFilterSortIndex,
  HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG,
  isHikingAndWildernessAreaTypeSlug,
  TRAILS_AND_ROUTES_CATEGORY_SLUG,
} from "./park-type-filters";
import type { FilterableMapPark, ParkDetail, ParkVisits } from "./parks";
import { getPublicParkTag, HOME_SUMMARY_TAG, MAP_SUMMARY_TAG } from "./public-cache";
import { appRoutes } from "./routes";

export type HomeSummary =
  paths["/api/home-summary"]["get"]["responses"][200]["content"]["application/json"];

export type MapSummary = Omit<
  paths["/api/map-summary"]["get"]["responses"][200]["content"]["application/json"],
  "parks"
> & {
  parks: FilterableMapPark[];
};

export interface HomeProgressItem {
  label: string;
  visited: number;
  total: number;
  href: string;
}

export const fetchHomeSummary = async (): Promise<HomeSummary> =>
  apiPublicFetch<HomeSummary>("/api/home-summary", {
    cache: "force-cache",
    next: {
      tags: [HOME_SUMMARY_TAG],
    },
  });

export const fetchMapSummary = async (): Promise<MapSummary> =>
  apiPublicFetch<MapSummary>("/api/map-summary", {
    cache: "force-cache",
    next: {
      tags: [MAP_SUMMARY_TAG],
    },
  });

export const fetchPublicParkDetail = async (
  slug: string,
  options?: {
    includeBoundary?: boolean;
  },
): Promise<ParkDetail> =>
  apiFetch<ParkDetail>(
    `/api/parks/${slug}${options?.includeBoundary ? "?includeBoundary=true" : ""}`,
    {
      cache: "force-cache",
      next: {
        tags: [getPublicParkTag(slug)],
      },
    },
  );

export const fetchPublicParkVisits = async (slug: string): Promise<ParkVisits> =>
  apiFetch<ParkVisits>(`/api/parks/${slug}/visits`, {
    cache: "force-cache",
    next: {
      tags: [getPublicParkTag(slug)],
    },
  });

export const createHomeProgressItems = (
  summary: HomeSummary,
  allParksLabel: string,
  magnetHuntLabel: string,
): HomeProgressItem[] => {
  const progressByType = summary.progressByType;
  const progressByCategory = summary.progressByCategory;

  const visibleTypeItems = progressByType
    .filter((item) => item.visible && !isHikingAndWildernessAreaTypeSlug(item.type.slug))
    .map((item) => ({
      label: item.type.name,
      mapFilter: item.type.slug,
      visited: item.visitedParks,
      total: item.totalParks,
    }));

  const hikingAndWildernessCategoryItems = progressByCategory
    .filter((item) => item.category.slug === HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG)
    .map((item) => ({
      label: item.category.name,
      mapFilter: item.category.slug,
      visited: item.visitedParks,
      total: item.totalParks,
    }));

  const trailCategoryItems = progressByCategory
    .filter((item) => item.category.slug === TRAILS_AND_ROUTES_CATEGORY_SLUG)
    .map((item) => ({
      label: item.category.name,
      mapFilter: item.category.slug,
      visited: item.visitedParks,
      total: item.totalParks,
    }));

  const progressItems = [
    ...visibleTypeItems,
    ...hikingAndWildernessCategoryItems,
    ...trailCategoryItems,
  ]
    .map((item) => ({
      ...item,
      sortIndex: getParkFilterSortIndex(item.mapFilter),
    }))
    .sort((left, right) => left.sortIndex - right.sortIndex)
    .map(({ sortIndex: _sortIndex, ...item }) => item);

  const totalParks = progressByCategory.reduce((sum, item) => sum + item.totalParks, 0);

  return [
    {
      label: allParksLabel,
      visited: summary.uniqueVisitedParks,
      total: totalParks,
      href: `${appRoutes.parks}?filter=all&visitStatus=visited`,
    },
    {
      label: magnetHuntLabel,
      visited: summary.magnetProgress.visitedParks,
      total: summary.magnetProgress.totalParks,
      href: `${appRoutes.visits}?view=parks`,
    },
    ...progressItems.map((item) => ({
      label: item.label,
      visited: item.visited,
      total: item.total,
      href: `${appRoutes.parks}?filter=${item.mapFilter}&visitStatus=visited`,
    })),
  ];
};
