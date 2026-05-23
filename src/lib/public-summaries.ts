import { apiPublicFetch } from "./api";
import type { paths } from "./api-types";
import type { ParkDetail, ParkVisits, VisitWithPark } from "./parks";
import { PUBLIC_HOME_SUMMARY_TAG, PUBLIC_MAP_SUMMARY_TAG, getPublicParkTag } from "./public-cache";

export type PublicHomeSummary =
  paths["/api/public/home-summary"]["get"]["responses"][200]["content"]["application/json"];

export type PublicMapSummary =
  paths["/api/public/map-summary"]["get"]["responses"][200]["content"]["application/json"];

export interface HomeProgressItem {
  label: string;
  visited: number;
  total: number;
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
  apiPublicFetch<ParkDetail>(
    `/api/parks/${slug}${options?.includeBoundary ? "?includeBoundary=true" : ""}`,
    {
      cache: "force-cache",
      next: {
        tags: [getPublicParkTag(slug)],
      },
    },
  );

export const fetchPublicParkVisits = async (slug: string): Promise<ParkVisits> =>
  apiPublicFetch<ParkVisits>(`/api/parks/${slug}/visits`, {
    cache: "force-cache",
    next: {
      tags: [getPublicParkTag(slug)],
    },
  });

export const createHomeProgressItems = (
  summary: PublicHomeSummary,
  allParksLabel: string,
): HomeProgressItem[] => {
  if (summary.progressByType.length === 0) {
    return [];
  }

  const totalParks = summary.progressByType.reduce((sum, item) => sum + item.totalParks, 0);

  return [
    {
      label: allParksLabel,
      visited: summary.uniqueVisitedParks,
      total: totalParks,
    },
    ...summary.progressByType
      .map((item) => ({
        label: item.type.name,
        visited: item.visitedParks,
        total: item.totalParks,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "fi-FI")),
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
  summary.recentVisits.map((visit) => ({
    parkName: visit.park.name,
    parkSlug: visit.park.slug,
    visitedOn: visit.visitedSummary.lastVisitedOn,
  }));

export const createHomeLatestVisitEntriesFromSummary = (
  summary: PublicHomeSummary,
): HomeLatestVisitEntryItem[] =>
  summary.latestVisitEntries.map((visit) => ({
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
    .slice(0, 5)
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
    .slice(0, 5)
    .map((visit) => ({
      id: visit.id,
      parkName: visit.park.name,
      parkSlug: visit.park.slug,
      createdAt: visit.createdAt,
    }));
