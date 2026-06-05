import { apiFetch, apiPublicFetch } from "./api";
import type { paths } from "./api-types";
import { TRAILS_AND_ROUTES_CATEGORY_SLUG, getParkTypeFilterSortIndex } from "./park-type-filters";
import type {
  MapPark,
  ParkCategorySlug,
  ParkDetail,
  ParkTypeSlug,
  ParkVisits,
  VisitWithPark,
} from "./parks";
import { PUBLIC_HOME_SUMMARY_TAG, PUBLIC_MAP_SUMMARY_TAG, getPublicParkTag } from "./public-cache";

export type PublicHomeSummary =
  paths["/api/public/home-summary"]["get"]["responses"][200]["content"]["application/json"];

export type PublicMapSummary = Omit<
  paths["/api/public/map-summary"]["get"]["responses"][200]["content"]["application/json"],
  "parks"
> & {
  parks: MapPark[];
};

export interface HomeProgressItem {
  label: string;
  visited: number;
  total: number;
  mapFilter?: ParkTypeSlug | ParkCategorySlug | "visited";
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

export const fetchPublicHomeSummary = async (): Promise<PublicHomeSummary> =>
  apiPublicFetch<PublicHomeSummary>("/api/public/home-summary", {
    cache: "force-cache",
    next: {
      tags: [PUBLIC_HOME_SUMMARY_TAG],
    },
  });

export const fetchPublicMapSummary = async (): Promise<PublicMapSummary> =>
  apiPublicFetch<PublicMapSummary>("/api/public/map-summary", {
    cache: "force-cache",
    next: {
      tags: [PUBLIC_MAP_SUMMARY_TAG],
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
  summary: PublicHomeSummary,
  allParksLabel: string,
): HomeProgressItem[] => {
  const visibleTypeItems = summary.progressByType
    .filter((item) => item.visible)
    .map((item) => ({
      label: item.type.name,
      mapFilter: item.type.slug,
      visited: item.visitedParks,
      total: item.totalParks,
      sortIndex: getParkTypeFilterSortIndex(item.type.slug),
    }))
    .sort((left, right) => {
      if (left.sortIndex !== right.sortIndex) {
        return left.sortIndex - right.sortIndex;
      }

      return left.label.localeCompare(right.label, "fi-FI");
    })
    .map(({ sortIndex: _sortIndex, ...item }) => item);

  const trailCategoryItems = summary.progressByCategory
    .filter((item) => item.category.slug === TRAILS_AND_ROUTES_CATEGORY_SLUG)
    .map((item) => ({
      label: item.category.name,
      mapFilter: item.category.slug,
      visited: item.visitedParks,
      total: item.totalParks,
    }));

  const progressItems = [...visibleTypeItems, ...trailCategoryItems];

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
      mapFilter: "visited",
    },
    ...progressItems,
  ];
};

export const createHomeMostVisitedParks = (summary: PublicHomeSummary): HomeMostVisitedPark[] =>
  summary.mostVisitedParks.map((park) => ({
    parkName: park.park.name,
    parkSlug: park.park.slug,
    visitCount: park.visitCount,
  }));

export const createHomeRecentVisitsFromSummary = (
  summary: PublicHomeSummary,
): HomeRecentVisitItem[] =>
  summary.recentVisits.slice(0, HOME_ACTIVITY_ITEM_LIMIT).map((visit) => ({
    parkName: visit.park.name,
    parkSlug: visit.park.slug,
    visitedOn: visit.visitedSummary.lastVisitedOn,
  }));

export const createHomeLatestVisitEntriesFromSummary = (
  summary: PublicHomeSummary,
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
