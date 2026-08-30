import { apiPublicFetch } from "./api";
import type { TripStoryListResponse, TripStorySummary } from "./trips";

export const TRIP_STORY_SEASONS = ["winter", "spring", "summer", "autumn"] as const;
export type TripStorySeason = (typeof TRIP_STORY_SEASONS)[number];

export type TripStoryFilters = {
  place: string | null;
  season: TripStorySeason | null;
  year: number | null;
};

export type HomeTripStoryModel = {
  featured: TripStorySummary | null;
  featuredReason: "latest" | "manual" | null;
  recent: TripStorySummary[];
  seasonalMemory: {
    story: TripStorySummary;
    yearsAgo: number;
  } | null;
};

const isSeason = (value: string): value is TripStorySeason =>
  (TRIP_STORY_SEASONS as readonly string[]).includes(value);

const firstSearchParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const parseTripStoryFilters = (
  searchParams: Record<string, string | string[] | undefined>,
  stories: TripStorySummary[],
): TripStoryFilters => {
  const yearValue = firstSearchParam(searchParams.year);
  const year = yearValue && /^\d{4}$/.test(yearValue) ? Number(yearValue) : null;
  const validYears = new Set(stories.flatMap((story) => story.years));
  const seasonValue = firstSearchParam(searchParams.season);
  const placeValue = firstSearchParam(searchParams.place);
  const validPlaces = new Set(stories.flatMap((story) => story.places.map((place) => place.slug)));

  return {
    place: placeValue && validPlaces.has(placeValue) ? placeValue : null,
    season: seasonValue && isSeason(seasonValue) ? seasonValue : null,
    year: year !== null && validYears.has(year) ? year : null,
  };
};

export const getTripStoryFilterOptions = (stories: TripStorySummary[]) => ({
  places: [
    ...new Map(
      stories.flatMap((story) => story.places.map((place) => [place.slug, place])),
    ).values(),
  ].sort((left, right) => left.name.localeCompare(right.name, "fi-FI")),
  seasons: TRIP_STORY_SEASONS.filter((season) =>
    stories.some((story) => story.seasons.includes(season)),
  ),
  years: [...new Set(stories.flatMap((story) => story.years))].sort((left, right) => right - left),
});

export const filterTripStories = (stories: TripStorySummary[], filters: TripStoryFilters) =>
  stories.filter(
    (story) =>
      (filters.year === null || story.years.includes(filters.year)) &&
      (filters.season === null || story.seasons.includes(filters.season)) &&
      (filters.place === null || story.places.some((place) => place.slug === filters.place)),
  );

export const fetchTripStories = () =>
  Promise.resolve(
    apiPublicFetch<TripStoryListResponse>("/api/trip-stories", { cache: "no-store" }),
  ).then((response) => ({ stories: response?.stories ?? [] }));

const getSeason = (month: number): TripStorySeason => {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
};

const getMonthDayDistance = (month: number, day: number, currentDate: Date) => {
  const currentYear = currentDate.getUTCFullYear();
  const candidate = Date.UTC(currentYear, month - 1, day);
  const current = Date.UTC(currentYear, currentDate.getUTCMonth(), currentDate.getUTCDate());
  return Math.abs(candidate - current) / 86_400_000;
};

export const selectHomeTripStories = (
  stories: TripStorySummary[],
  currentDate: Date,
): HomeTripStoryModel => {
  const featured = stories.find((story) => story.featured) ?? stories[0] ?? null;
  const featuredReason = featured ? (featured.featured ? "manual" : "latest") : null;
  const recent = stories.filter((story) => story !== featured).slice(0, 3);
  const used = new Set([featured, ...recent]);
  const season = getSeason(currentDate.getUTCMonth() + 1);
  const currentYear = currentDate.getUTCFullYear();
  const seasonalCandidate = stories
    .filter((story) => {
      if (used.has(story) || !story.dateRange || !story.seasons.includes(season)) return false;
      const start = new Date(`${story.dateRange.start}T00:00:00Z`);
      if (start.getUTCFullYear() === currentYear) return false;
      return getMonthDayDistance(start.getUTCMonth() + 1, start.getUTCDate(), currentDate) <= 45;
    })
    .sort((left, right) => {
      const leftStart = new Date(`${left.dateRange?.start ?? ""}T00:00:00Z`);
      const rightStart = new Date(`${right.dateRange?.start ?? ""}T00:00:00Z`);
      const distance =
        getMonthDayDistance(leftStart.getUTCMonth() + 1, leftStart.getUTCDate(), currentDate) -
        getMonthDayDistance(rightStart.getUTCMonth() + 1, rightStart.getUTCDate(), currentDate);
      return distance || rightStart.getTime() - leftStart.getTime();
    })[0];

  return {
    featured,
    featuredReason,
    recent,
    seasonalMemory: seasonalCandidate
      ? {
          story: seasonalCandidate,
          yearsAgo: currentYear - Number(seasonalCandidate.dateRange?.start.slice(0, 4)),
        }
      : null,
  };
};
