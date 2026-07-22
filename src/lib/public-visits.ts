import { apiPublicFetch } from "./api";
import type { paths } from "./api-types";
import type { FilterableMapPark } from "./parks";
import { PUBLIC_VISITS_TAG } from "./public-cache";
import { appRoutes, createPathWithSearchParams } from "./routes";

interface ResolvePublicVisitsFiltersOptions {
  monthParam?: string | string[] | undefined;
  yearParam?: string | string[] | undefined;
}

interface BuildPublicVisitsTimelineModelOptions {
  currentYear?: number;
  selectedMonth: number | null;
  selectedYear: number | null;
}

export interface PublicVisitMonthOption {
  hasVisits: boolean;
  label: string;
  longLabel: string;
  value: number;
}

export interface PublicVisitMonthSection {
  items: PublicVisitTimelineItem[];
  label: string;
  month: number;
}

export interface PublicVisitYearSection {
  months: PublicVisitMonthSection[];
  year: number;
}

export interface PublicVisitsTimelineModel {
  availableYears: number[];
  filteredVisits: FrontendTimelineVisit[];
  monthOptions: PublicVisitMonthOption[];
  sections: PublicVisitYearSection[];
  selectedMonth: number | null;
  selectedYear: number | null;
}

export type PublicVisitsView = "timeline" | "map";

export type PublicVisitsMapPark = Pick<FilterableMapPark, "markerPoint" | "name" | "slug">;

export interface PublicVisitsMapMarker {
  coordinates: {
    lat: number;
    lon: number;
  };
  name: string;
  slug: string;
  visitCount: number;
  years: number[];
}

export type FrontendTimelineVisit =
  paths["/api/visits-timeline"]["get"]["responses"][200]["content"]["application/json"]["visits"][number];

export interface PublicVisitTimelineVisitItem {
  kind: "visit";
  visit: FrontendTimelineVisit;
}

export interface PublicVisitTimelineTripItem {
  dateRange: {
    end: string;
    start: string;
  };
  imageCount: number;
  kind: "trip";
  latestVisit: FrontendTimelineVisit;
  name: string;
  parkCount: number;
  tripId: number;
  visitCount: number;
  visits: FrontendTimelineVisit[];
}

export type PublicVisitTimelineItem = PublicVisitTimelineTripItem | PublicVisitTimelineVisitItem;

const MONTH_FILTER_LABEL_FORMATTER = new Intl.DateTimeFormat("fi-FI", {
  month: "short",
  timeZone: "Europe/Helsinki",
});

const MONTH_TIMELINE_LABEL_FORMATTER = new Intl.DateTimeFormat("fi-FI", {
  month: "long",
  timeZone: "Europe/Helsinki",
});

const YEAR_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Helsinki",
  year: "numeric",
});

const getVisitYear = (visitedOn: string) => Number.parseInt(visitedOn.slice(0, 4), 10);

const getVisitMonth = (visitedOn: string) => Number.parseInt(visitedOn.slice(5, 7), 10);

const getCurrentHelsinkiYear = () => Number.parseInt(YEAR_FORMATTER.format(new Date()), 10);

const normalizeSearchParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const parseIntegerParam = (value?: string | string[]) => {
  const normalizedValue = normalizeSearchParam(value);

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number.parseInt(normalizedValue, 10);

  return Number.isInteger(parsedValue) ? parsedValue : null;
};

const compareVisitsByTimeline = (left: FrontendTimelineVisit, right: FrontendTimelineVisit) =>
  right.visitedOn.localeCompare(left.visitedOn) ||
  right.createdAt.localeCompare(left.createdAt) ||
  right.id - left.id;

const compareVisitsByTripNarrative = (left: FrontendTimelineVisit, right: FrontendTimelineVisit) =>
  left.visitedOn.localeCompare(right.visitedOn) ||
  left.createdAt.localeCompare(right.createdAt) ||
  left.id - right.id;

const buildAvailableVisitMonths = (visits: FrontendTimelineVisit[], year: number | null) => {
  const availableMonths = new Set<number>();

  if (year === null) {
    return availableMonths;
  }

  for (const visit of visits) {
    if (getVisitYear(visit.visitedOn) !== year) {
      continue;
    }

    availableMonths.add(getVisitMonth(visit.visitedOn));
  }

  return availableMonths;
};

const normalizeSelectedVisitMonth = ({
  availableMonths,
  selectedMonth,
  selectedYear,
}: {
  availableMonths: Set<number>;
  selectedMonth: number | null;
  selectedYear: number | null;
}) => {
  if (
    selectedYear === null ||
    selectedMonth === null ||
    selectedMonth < 1 ||
    selectedMonth > 12 ||
    !availableMonths.has(selectedMonth)
  ) {
    return null;
  }

  return selectedMonth;
};

export const fetchVisitsTimeline = async (): Promise<{ visits: FrontendTimelineVisit[] }> =>
  apiPublicFetch<{ visits: FrontendTimelineVisit[] }>("/api/visits-timeline", {
    cache: "force-cache",
    next: {
      tags: [PUBLIC_VISITS_TAG],
    },
  });

export const resolvePublicVisitsView = (value?: string | string[]): PublicVisitsView =>
  normalizeSearchParam(value) === "map" ? "map" : "timeline";

export const createPublicVisitsHref = ({
  month,
  year,
  view,
}: {
  month?: number | null;
  year?: number | null;
  view?: PublicVisitsView;
}) => {
  const searchParams = new URLSearchParams();

  if (typeof year === "number") {
    searchParams.set("year", String(year));
  }

  if (view !== "map" && typeof year === "number" && typeof month === "number") {
    searchParams.set("month", String(month));
  }

  if (view === "map") {
    searchParams.set("view", "map");
  }

  const query = searchParams.toString();

  return query ? `${appRoutes.visits}?${query}` : appRoutes.visits;
};

export const createParkVisitHref = ({
  parkSlug,
  visitId,
}: {
  parkSlug: string;
  visitId?: number;
}) => {
  if (visitId === undefined) {
    return appRoutes.park(parkSlug);
  }

  return `${createPathWithSearchParams(appRoutes.park(parkSlug), { visit: visitId })}#visit-history`;
};

export const buildAvailableVisitYears = (
  visits: FrontendTimelineVisit[],
  currentYear = getCurrentHelsinkiYear(),
) => {
  if (visits.length === 0) {
    return [];
  }

  const firstVisitYear = visits.reduce((lowestYear, visit) => {
    const visitYear = getVisitYear(visit.visitedOn);
    return Math.min(lowestYear, visitYear);
  }, Number.POSITIVE_INFINITY);

  const availableYears: number[] = [];

  for (let year = firstVisitYear; year <= currentYear; year += 1) {
    availableYears.push(year);
  }

  return availableYears.reverse();
};

export const createPublicVisitMonthOptions = (
  availableMonths = new Set<number>(),
): PublicVisitMonthOption[] =>
  Array.from({ length: 12 }, (_, index) => {
    const value = index + 1;

    return {
      hasVisits: availableMonths.has(value),
      value,
      label: MONTH_FILTER_LABEL_FORMATTER.format(new Date(Date.UTC(2024, index, 1, 12))),
      longLabel: MONTH_TIMELINE_LABEL_FORMATTER.format(new Date(Date.UTC(2024, index, 1, 12))),
    };
  });

const createPublicVisitTimelineMonthLabel = (month: number) =>
  MONTH_TIMELINE_LABEL_FORMATTER.format(new Date(Date.UTC(2024, month - 1, 1, 12)));

export const resolvePublicVisitsFilters = (
  visits: FrontendTimelineVisit[],
  { yearParam, monthParam }: ResolvePublicVisitsFiltersOptions,
  currentYear = getCurrentHelsinkiYear(),
) => {
  const availableYears = buildAvailableVisitYears(visits, currentYear);
  const requestedYear = parseIntegerParam(yearParam);
  const selectedYear =
    requestedYear !== null && availableYears.includes(requestedYear) ? requestedYear : null;
  const availableMonths = buildAvailableVisitMonths(visits, selectedYear);
  const requestedMonth = parseIntegerParam(monthParam);
  const selectedMonth = normalizeSelectedVisitMonth({
    availableMonths,
    selectedMonth: requestedMonth,
    selectedYear,
  });

  return {
    selectedYear,
    selectedMonth,
  };
};

export const buildPublicVisitsTimelineModel = (
  visits: FrontendTimelineVisit[],
  {
    currentYear = getCurrentHelsinkiYear(),
    selectedMonth,
    selectedYear,
  }: BuildPublicVisitsTimelineModelOptions,
): PublicVisitsTimelineModel => {
  const availableYears = buildAvailableVisitYears(visits, currentYear);
  const normalizedSelectedYear =
    selectedYear !== null && availableYears.includes(selectedYear) ? selectedYear : null;
  const availableMonths = buildAvailableVisitMonths(visits, normalizedSelectedYear);
  const normalizedSelectedMonth = normalizeSelectedVisitMonth({
    availableMonths,
    selectedMonth,
    selectedYear: normalizedSelectedYear,
  });

  const filteredVisits = [...visits]
    .filter((visit) => {
      const visitYear = getVisitYear(visit.visitedOn);
      const visitMonth = getVisitMonth(visit.visitedOn);

      if (normalizedSelectedYear !== null && visitYear !== normalizedSelectedYear) {
        return false;
      }

      if (normalizedSelectedMonth !== null && visitMonth !== normalizedSelectedMonth) {
        return false;
      }

      return true;
    })
    .sort(compareVisitsByTimeline);

  const tripVisitsByTripId = new Map<number, FrontendTimelineVisit[]>();
  const looseVisits: FrontendTimelineVisit[] = [];

  for (const visit of filteredVisits) {
    if (visit.trip) {
      const groupedTripVisits = tripVisitsByTripId.get(visit.trip.id) ?? [];
      groupedTripVisits.push(visit);
      tripVisitsByTripId.set(visit.trip.id, groupedTripVisits);
      continue;
    }

    looseVisits.push(visit);
  }

  const yearSections = new Map<number, Map<number, PublicVisitTimelineItem[]>>();

  const addTimelineItem = (visitedOn: string, item: PublicVisitTimelineItem) => {
    const visitYear = getVisitYear(visitedOn);
    const visitMonth = getVisitMonth(visitedOn);
    const yearMonths = yearSections.get(visitYear) ?? new Map<number, PublicVisitTimelineItem[]>();
    const monthItems = yearMonths.get(visitMonth) ?? [];

    monthItems.push(item);
    yearMonths.set(visitMonth, monthItems);
    yearSections.set(visitYear, yearMonths);
  };

  for (const visit of looseVisits) {
    addTimelineItem(visit.visitedOn, {
      kind: "visit",
      visit,
    });
  }

  for (const [tripId, groupedTripVisits] of tripVisitsByTripId.entries()) {
    const latestVisit = [...groupedTripVisits].sort(compareVisitsByTimeline)[0];

    if (!latestVisit?.trip) {
      continue;
    }

    const visitsInNarrativeOrder = [...groupedTripVisits].sort(compareVisitsByTripNarrative);
    const imageCount = groupedTripVisits.reduce((sum, visit) => sum + visit.imageCount, 0);
    const parkCount = new Set(groupedTripVisits.map((visit) => visit.park.slug)).size;
    const tripItem: PublicVisitTimelineTripItem = {
      kind: "trip",
      tripId,
      name: latestVisit.trip.name,
      dateRange: {
        start: visitsInNarrativeOrder[0]?.visitedOn ?? latestVisit.visitedOn,
        end:
          visitsInNarrativeOrder[visitsInNarrativeOrder.length - 1]?.visitedOn ??
          latestVisit.visitedOn,
      },
      imageCount,
      latestVisit,
      parkCount,
      visitCount: groupedTripVisits.length,
      visits: visitsInNarrativeOrder,
    };

    addTimelineItem(latestVisit.visitedOn, tripItem);
  }

  const monthOptions = createPublicVisitMonthOptions(availableMonths);

  const compareTimelineItems = (left: PublicVisitTimelineItem, right: PublicVisitTimelineItem) => {
    const leftVisit = left.kind === "trip" ? left.latestVisit : left.visit;
    const rightVisit = right.kind === "trip" ? right.latestVisit : right.visit;

    return compareVisitsByTimeline(leftVisit, rightVisit);
  };

  const sections = [...yearSections.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort((left, right) => right[0] - left[0])
        .map(([month, monthItems]) => ({
          month,
          label: createPublicVisitTimelineMonthLabel(month),
          items: [...monthItems].sort(compareTimelineItems),
        })),
    }));

  return {
    availableYears,
    filteredVisits,
    monthOptions,
    sections,
    selectedMonth: normalizedSelectedMonth,
    selectedYear: normalizedSelectedYear,
  };
};

export const buildPublicVisitsMapModel = (
  visits: FrontendTimelineVisit[],
  parks: PublicVisitsMapPark[],
  {
    selectedMonth,
    selectedYear,
  }: {
    selectedMonth: number | null;
    selectedYear: number | null;
  },
): PublicVisitsMapMarker[] => {
  const parksBySlug = new Map(parks.map((park) => [park.slug, park]));
  const markersBySlug = new Map<
    string,
    { park: PublicVisitsMapPark; visitCount: number; years: Set<number> }
  >();

  for (const visit of visits) {
    const visitYear = getVisitYear(visit.visitedOn);

    if (selectedYear !== null && visitYear !== selectedYear) {
      continue;
    }

    if (selectedMonth !== null && getVisitMonth(visit.visitedOn) !== selectedMonth) {
      continue;
    }

    // Timeline visits carry no coordinates, so the map joins them to the map
    // summary by slug. Visits whose park is missing from the summary (for
    // example a hidden park) stay counted in the timeline but are skipped here.
    const park = parksBySlug.get(visit.park.slug);

    if (!park) {
      continue;
    }

    const marker = markersBySlug.get(park.slug) ?? {
      park,
      visitCount: 0,
      years: new Set<number>(),
    };
    marker.visitCount += 1;
    marker.years.add(visitYear);
    markersBySlug.set(park.slug, marker);
  }

  return [...markersBySlug.values()]
    .map(({ park, visitCount, years }) => ({
      slug: park.slug,
      name: park.name,
      coordinates: { lat: park.markerPoint.lat, lon: park.markerPoint.lon },
      visitCount,
      years: [...years].sort((left, right) => left - right),
    }))
    .sort(
      (left, right) =>
        right.visitCount - left.visitCount || left.name.localeCompare(right.name, "fi-FI"),
    );
};
