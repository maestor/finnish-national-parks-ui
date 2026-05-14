import type { paths } from "./api-types";

export type Park =
  paths["/api/parks"]["get"]["responses"][200]["content"]["application/json"]["parks"][number];

type ApiPersonalPark =
  paths["/api/me/parks"]["get"]["responses"][200]["content"]["application/json"]["parks"][number];

type ApiVisit =
  paths["/api/me/parks"]["get"]["responses"][200]["content"]["application/json"]["parks"][number]["visits"][number];

export type VisitImage = ApiVisit["images"][number];

export type Visit = ApiVisit;

export type PersonalPark = ApiPersonalPark;

export type MapPark = Park & {
  visitedSummary?: {
    visited: boolean;
    visitCount?: number;
  };
};

export type VisitWithPark = Visit & {
  parkSlug: string;
  parkName: string;
};

export const getVisitStatusColor = (park: MapPark): string => {
  if (park.visitedSummary?.visited) {
    return "#16a34a";
  }
  return "#64748b";
};
