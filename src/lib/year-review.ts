import type { FrontendTimelineVisit } from "./public-visits";

export interface YearReviewMostVisitedPark {
  name: string;
  slug: string;
  visitCount: number;
}

export interface YearReviewSeasonalVisits {
  autumn: number;
  spring: number;
  summer: number;
  winter: number;
}

export interface YearReviewStats {
  activeMonthCount: number;
  distinctParkCount: number;
  imageCount: number;
  mostVisitedPark: YearReviewMostVisitedPark | null;
  newParkCount: number;
  revisitedParkCount: number;
  seasonalVisits: YearReviewSeasonalVisits;
  visitCount: number;
  year: number;
}

const getVisitMonth = (visitedOn: string) => Number.parseInt(visitedOn.slice(5, 7), 10);

const getSeasonKey = (month: number): keyof YearReviewSeasonalVisits => {
  if (month >= 3 && month <= 5) {
    return "spring";
  }

  if (month >= 6 && month <= 8) {
    return "summer";
  }

  if (month >= 9 && month <= 11) {
    return "autumn";
  }

  return "winter";
};

// A park is "new" in the review year when its earliest-ever visit falls in that
// year; visited before that means the year's visits were revisits.
const getEarliestVisitYearByPark = (visits: FrontendTimelineVisit[]) => {
  const earliestBySlug = new Map<string, number>();

  for (const visit of visits) {
    const visitYear = Number.parseInt(visit.visitedOn.slice(0, 4), 10);
    const earliest = earliestBySlug.get(visit.park.slug);

    if (earliest === undefined || visitYear < earliest) {
      earliestBySlug.set(visit.park.slug, visitYear);
    }
  }

  return earliestBySlug;
};

export const buildYearReviewStats = (
  visits: FrontendTimelineVisit[],
  year: number,
): YearReviewStats => {
  const earliestVisitYearByPark = getEarliestVisitYearByPark(visits);
  const yearVisits = visits.filter(
    (visit) => Number.parseInt(visit.visitedOn.slice(0, 4), 10) === year,
  );

  const seasonalVisits: YearReviewSeasonalVisits = { spring: 0, summer: 0, autumn: 0, winter: 0 };
  const activeMonths = new Set<number>();
  const visitsByPark = new Map<string, YearReviewMostVisitedPark>();
  let imageCount = 0;

  for (const visit of yearVisits) {
    const month = getVisitMonth(visit.visitedOn);
    seasonalVisits[getSeasonKey(month)] += 1;
    activeMonths.add(month);
    imageCount += visit.imageCount;

    const parkEntry = visitsByPark.get(visit.park.slug) ?? {
      name: visit.park.name,
      slug: visit.park.slug,
      visitCount: 0,
    };
    parkEntry.visitCount += 1;
    visitsByPark.set(visit.park.slug, parkEntry);
  }

  let newParkCount = 0;
  let revisitedParkCount = 0;

  for (const slug of visitsByPark.keys()) {
    if (earliestVisitYearByPark.get(slug) === year) {
      newParkCount += 1;
    } else {
      revisitedParkCount += 1;
    }
  }

  const mostVisitedPark =
    [...visitsByPark.values()].sort(
      (left, right) => right.visitCount - left.visitCount || left.name.localeCompare(right.name),
    )[0] ?? null;

  return {
    year,
    visitCount: yearVisits.length,
    distinctParkCount: visitsByPark.size,
    newParkCount,
    revisitedParkCount,
    mostVisitedPark,
    activeMonthCount: activeMonths.size,
    imageCount,
    seasonalVisits,
  };
};
