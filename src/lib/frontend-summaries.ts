import { apiFetch, apiPublicFetch } from "./api";
import type { paths } from "./api-types";
import {
  HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG,
  TRAILS_AND_ROUTES_CATEGORY_SLUG,
  getParkFilterSortIndex,
  isHikingAndWildernessAreaTypeSlug,
} from "./park-type-filters";
import type {
  FilterableMapPark,
  ParkCategorySlug,
  ParkDetail,
  ParkTypeSlug,
  ParkVisits,
  VisitWithPark,
} from "./parks";
import { HOME_SUMMARY_TAG, MAP_SUMMARY_TAG, getPublicParkTag } from "./public-cache";

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
  mapFilter?: "all" | ParkTypeSlug | ParkCategorySlug;
  mapVisitStatus?: "visited" | "not-visited";
}

export interface HomeMostVisitedPark {
  parkName: string;
  parkSlug: string;
  visitCount: number;
}

export interface HomeRecentVisitItem {
  id?: number;
  parkName: string;
  parkSlug: string;
  visitedOn: string | null;
}

export interface HomeLatestVisitEntryItem {
  id?: number;
  parkName: string;
  parkSlug: string;
  createdAt: string;
}

const HOME_ACTIVITY_ITEM_LIMIT = 10;

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
): HomeProgressItem[] => {
  const visibleTypeItems = summary.progressByType
    .filter((item) => item.visible && !isHikingAndWildernessAreaTypeSlug(item.type.slug))
    .map((item) => ({
      label: item.type.name,
      mapFilter: item.type.slug,
      visited: item.visitedParks,
      total: item.totalParks,
    }));

  const hikingAndWildernessCategoryItems = summary.progressByCategory
    .filter((item) => item.category.slug === HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG)
    .map((item) => ({
      label: item.category.name,
      mapFilter: item.category.slug,
      visited: item.visitedParks,
      total: item.totalParks,
    }));

  const trailCategoryItems = summary.progressByCategory
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
      sortIndex: getParkFilterSortIndex(item.mapFilter ?? ""),
    }))
    .sort((left, right) => {
      if (left.sortIndex !== right.sortIndex) {
        return left.sortIndex - right.sortIndex;
      }

      return left.label.localeCompare(right.label, "fi-FI");
    })
    .map(({ sortIndex: _sortIndex, ...item }) => item);

  if (progressItems.length === 0) {
    return [];
  }

  const totalParks =
    summary.progressByCategory.length > 0
      ? summary.progressByCategory.reduce((sum, item) => sum + item.totalParks, 0)
      : summary.progressByType.reduce((sum, item) => sum + item.totalParks, 0);

  return [
    {
      label: allParksLabel,
      visited: summary.uniqueVisitedParks,
      total: totalParks,
      mapFilter: "all",
      mapVisitStatus: "visited",
    },
    ...progressItems.map((item) => ({
      ...item,
      mapVisitStatus: "visited" as const,
    })),
  ];
};

export const createHomeMostVisitedParks = (summary: HomeSummary): HomeMostVisitedPark[] =>
  summary.mostVisitedParks.map((park) => ({
    parkName: park.park.name,
    parkSlug: park.park.slug,
    visitCount: park.visitCount,
  }));

export const createHomeRecentVisitsFromSummary = (summary: HomeSummary): HomeRecentVisitItem[] =>
  summary.recentVisits.slice(0, HOME_ACTIVITY_ITEM_LIMIT).map((visit) => ({
    parkName: visit.park.name,
    parkSlug: visit.park.slug,
    visitedOn: visit.visitedSummary.lastVisitedOn,
  }));

export const createHomeLatestVisitEntriesFromSummary = (
  summary: HomeSummary,
): HomeLatestVisitEntryItem[] =>
  [...summary.latestVisitEntries]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id - left.id)
    .slice(0, HOME_ACTIVITY_ITEM_LIMIT)
    .map((visit) => ({
      id: visit.id,
      parkName: visit.park.name,
      parkSlug: visit.park.slug,
      createdAt: visit.createdAt,
    }));

export const createHomeRecentVisitsFromVisitList = (
  visits: VisitWithPark[],
): HomeRecentVisitItem[] =>
  [...visits]
    .sort((left, right) => right.visitedOn.localeCompare(left.visitedOn))
    .slice(0, HOME_ACTIVITY_ITEM_LIMIT)
    .map((visit) => ({
      id: visit.id,
      parkName: visit.park.name,
      parkSlug: visit.park.slug,
      visitedOn: visit.visitedOn,
    }));

export const createHomeLatestVisitEntriesFromVisitList = (
  visits: VisitWithPark[],
): HomeLatestVisitEntryItem[] =>
  [...visits]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, HOME_ACTIVITY_ITEM_LIMIT)
    .map((visit) => ({
      id: visit.id,
      parkName: visit.park.name,
      parkSlug: visit.park.slug,
      createdAt: visit.createdAt,
    }));
