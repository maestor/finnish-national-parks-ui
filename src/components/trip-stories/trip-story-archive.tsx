import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  PUBLIC_EMPTY_STATE_PANEL_CLASS_NAME,
  PUBLIC_PANEL_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { appRoutes } from "@/lib/routes";
import { getTripStoryFilterOptions, type TripStoryFilters } from "@/lib/trip-stories";
import type { TripStorySummary } from "@/lib/trips";
import { TripStoryCard } from "./trip-story-card";

export const TripStoryArchive = ({
  stories,
  filteredStories,
  filters,
  error,
}: {
  stories: TripStorySummary[];
  filteredStories: TripStorySummary[];
  filters: TripStoryFilters;
  error: string | null;
}) => {
  const t = useTranslations("trips");
  const options = getTripStoryFilterOptions(stories);
  const isFiltered = filters.year !== null || filters.season !== null || filters.place !== null;
  const selectClass =
    "w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div className="space-y-6">
      <section className={PUBLIC_PANEL_CLASS_NAME} aria-labelledby="trip-archive-filters">
        <h2 id="trip-archive-filters" className="mb-4 text-lg font-semibold">
          {t("filters")}
        </h2>
        <form method="get" className="grid gap-4 sm:grid-cols-3">
          {options.years.length >= 2 && (
            <label className="space-y-1.5 text-sm font-medium">
              <span>{t("year")}</span>
              <select
                name="year"
                defaultValue={filters.year?.toString() ?? ""}
                className={selectClass}
              >
                <option value="">{t("allYears")}</option>
                {options.years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          )}
          {options.seasons.length >= 2 && (
            <label className="space-y-1.5 text-sm font-medium">
              <span>{t("season")}</span>
              <select name="season" defaultValue={filters.season ?? ""} className={selectClass}>
                <option value="">{t("allSeasons")}</option>
                {options.seasons.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
            </label>
          )}
          {options.places.length >= 2 && (
            <label className="space-y-1.5 text-sm font-medium">
              <span>{t("place")}</span>
              <select name="place" defaultValue={filters.place ?? ""} className={selectClass}>
                <option value="">{t("allPlaces")}</option>
                {options.places.map((place) => (
                  <option key={place.slug} value={place.slug}>
                    {place.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-end gap-3 sm:col-span-3">
            <button
              type="submit"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("apply")}
            </button>
            {isFiltered === true && (
              <Link
                href={appRoutes.trips}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("reset")}
              </Link>
            )}
          </div>
        </form>
      </section>
      {error ? (
        <div role="alert" className={PUBLIC_EMPTY_STATE_PANEL_CLASS_NAME}>
          <h2 className="text-lg font-semibold">{t("errorTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Link
            href={appRoutes.trips}
            className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {t("retry")}
          </Link>
        </div>
      ) : filteredStories.length > 0 ? (
        <>
          <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
            {t("resultCount", { count: filteredStories.length })}
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {filteredStories.map((story) => (
              <TripStoryCard key={story.slug} story={story} />
            ))}
          </div>
        </>
      ) : (
        <div className={PUBLIC_EMPTY_STATE_PANEL_CLASS_NAME}>
          <h2 className="text-lg font-semibold">
            {isFiltered ? t("filteredEmptyTitle") : t("emptyTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("emptyDescription")}</p>
          {isFiltered ? (
            <Link
              href={appRoutes.trips}
              className="mt-4 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold"
            >
              {t("reset")}
            </Link>
          ) : (
            <div className="mt-4 flex justify-center gap-3">
              <Link
                href={appRoutes.visits}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                {t("emptyVisits")}
              </Link>
              <Link
                href={appRoutes.parks}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
              >
                {t("emptyParks")}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
