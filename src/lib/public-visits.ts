import { apiPublicFetch } from "./api";
import type { paths } from "./api-types";
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
  label: string;
  month: number;
  visits: FrontendTimelineVisit[];
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

export type FrontendTimelineVisit =
  paths["/api/visits-timeline"]["get"]["responses"][200]["content"]["application/json"]["visits"][number];

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

export const createPublicVisitsHref = ({
  month,
  year,
}: {
  month?: number | null;
  year?: number | null;
}) => {
  const searchParams = new URLSearchParams();

  if (typeof year === "number") {
    searchParams.set("year", String(year));
  }

  if (typeof year === "number" && typeof month === "number") {
    searchParams.set("month", String(month));
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

  const yearSections = new Map<number, Map<number, FrontendTimelineVisit[]>>();

  for (const visit of filteredVisits) {
    const visitYear = getVisitYear(visit.visitedOn);
    const visitMonth = getVisitMonth(visit.visitedOn);
    const yearMonths = yearSections.get(visitYear) ?? new Map<number, FrontendTimelineVisit[]>();
    const monthVisits = yearMonths.get(visitMonth) ?? [];

    monthVisits.push(visit);
    yearMonths.set(visitMonth, monthVisits);
    yearSections.set(visitYear, yearMonths);
  }

  const monthOptions = createPublicVisitMonthOptions(availableMonths);

  const sections = [...yearSections.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([year, months]) => ({
      year,
      months: [...months.entries()]
        .sort((left, right) => right[0] - left[0])
        .map(([month, monthVisits]) => ({
          month,
          label: createPublicVisitTimelineMonthLabel(month),
          visits: monthVisits,
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
