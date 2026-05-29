import type { paths } from "./api-types";

export type Park =
  paths["/api/parks"]["get"]["responses"][200]["content"]["application/json"]["parks"][number];

export type ParkDetail =
  paths["/api/parks/{slug}"]["get"]["responses"][200]["content"]["application/json"];

export type ParkVisits =
  paths["/api/parks/{slug}/visits"]["get"]["responses"][200]["content"]["application/json"];

export type VisitedSummary = ParkVisits["visitedSummary"];

export type Visit = ParkVisits["visits"][number];

export type VisitWithPark =
  paths["/api/visits"]["get"]["responses"][200]["content"]["application/json"]["visits"][number];

export type VisitImage = Visit["images"][number];

export type MapPark = Park & {
  visitedSummary: VisitedSummary;
};

export type AdminMapPark = MapPark & {
  removed: boolean;
};

export const toAdminMapParks = (parks: Park[], removedParks: Park[]): AdminMapPark[] => {
  const visible = parks.map((park) => ({
    ...park,
    visitedSummary: createEmptyVisitedSummary(),
    removed: false,
  }));
  const removed = removedParks.map((park) => ({
    ...park,
    visitedSummary: createEmptyVisitedSummary(),
    removed: true,
  }));
  return [...visible, ...removed];
};

export const getAdminMarkerColor = (park: AdminMapPark): string => {
  if (park.removed) {
    return "#ef4444";
  }
  return getVisitStatusColor(park);
};

type ParkTypeDisplayNameSource = Pick<Park, "displayTypeName" | "type">;

export const createEmptyVisitedSummary = (): VisitedSummary => ({
  lastVisitedOn: null,
  visitCount: 0,
  visited: false,
});

export const buildVisitedSummaryByParkSlug = (
  visits: VisitWithPark[],
): Map<string, VisitedSummary> => {
  const visitedSummaryByParkSlug = new Map<string, VisitedSummary>();

  for (const visit of visits) {
    const currentSummary =
      visitedSummaryByParkSlug.get(visit.park.slug) ?? createEmptyVisitedSummary();
    const nextLastVisitedOn =
      currentSummary.lastVisitedOn === null || visit.visitedOn > currentSummary.lastVisitedOn
        ? visit.visitedOn
        : currentSummary.lastVisitedOn;

    visitedSummaryByParkSlug.set(visit.park.slug, {
      visited: true,
      visitCount: currentSummary.visitCount + 1,
      lastVisitedOn: nextLastVisitedOn,
    });
  }

  return visitedSummaryByParkSlug;
};

export const mergeParksWithVisitSummaries = (parks: Park[], visits: VisitWithPark[]): MapPark[] => {
  const visitedSummaryByParkSlug = buildVisitedSummaryByParkSlug(visits);

  return parks.map((park) => ({
    ...park,
    visitedSummary: visitedSummaryByParkSlug.get(park.slug) ?? createEmptyVisitedSummary(),
  }));
};

export const getParkTypeDisplayName = (park: ParkTypeDisplayNameSource): string =>
  park.displayTypeName ?? park.type.name;

export const getVisitStatusColor = (park: MapPark): string => {
  if (park.visitedSummary.visited) {
    return "#16a34a";
  }
  return "#64748b";
};
