import type { paths } from "./api-types";

export type Park =
  paths["/api/parks"]["get"]["responses"][200]["content"]["application/json"]["parks"][number];

export type PersonalPark =
  paths["/api/me/parks"]["get"]["responses"][200]["content"]["application/json"]["parks"][number];

export type MapPark = Park & {
  visitedSummary?: {
    visited: boolean;
    visitCount?: number;
  };
};

export type Visit =
  paths["/api/me/parks"]["get"]["responses"][200]["content"]["application/json"]["parks"][number]["visits"][number];

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
