"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { getParkTypeDisplayName } from "@/lib/parks";
import { type TripPlannerParkResult, searchTripPlanner } from "@/lib/trip-planner";
import { Loader2, Route } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";

const INPUT_CLASS_NAME =
  "flex h-11 w-full rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";
const PANEL_CLASS_NAME =
  "rounded-[1.75rem] border border-white/45 bg-white/72 p-5 shadow-[0_20px_44px_rgba(148,163,184,0.18)] backdrop-blur-md dark:border-white/10 dark:bg-slate-950/52 dark:shadow-[0_28px_56px_rgba(2,6,23,0.3)]";

const DISTANCE_FORMATTER = new Intl.NumberFormat("fi-FI", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const DURATION_FORMATTER = new Intl.NumberFormat("fi-FI", {
  maximumFractionDigits: 0,
});

type SearchState = "idle" | "loading" | "success" | "error";

const formatDistanceFromRoute = (distanceFromRouteKm: number) =>
  `${DISTANCE_FORMATTER.format(distanceFromRouteKm)} km`;

const formatRouteDistance = (distanceMeters: number) => `${Math.round(distanceMeters / 1000)} km`;

const formatRouteDuration = (durationSeconds: number) => {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.round((durationSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} h ${DURATION_FORMATTER.format(minutes)} min`;
  }

  return `${DURATION_FORMATTER.format(minutes)} min`;
};

const splitTripPlannerResults = (parks: TripPlannerParkResult[]) => {
  return parks.reduce(
    (groups, park) => {
      if (park.visitedSummary.visited) {
        groups.visited.push(park);
      } else {
        groups.notVisited.push(park);
      }

      return groups;
    },
    { visited: [] as TripPlannerParkResult[], notVisited: [] as TripPlannerParkResult[] },
  );
};

export const TripPlannerPage = () => {
  const t = useTranslations("tripPlanner");
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof searchTripPlanner>> | null>(null);

  const groupedResults = useMemo(() => splitTripPlannerResults(result?.parks ?? []), [result]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchState("loading");
    setErrorMessage(null);

    try {
      const response = await searchTripPlanner({
        destinationQuery: destinationQuery.trim(),
        originQuery: originQuery.trim(),
      });

      setResult(response);
      setSearchState("success");
    } catch (failure) {
      setSearchState("error");
      setResult(null);
      setErrorMessage(failure instanceof Error ? failure.message : t("errors.generic"));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className={cn(PANEL_CLASS_NAME, "space-y-4")}>
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{t("description")}</p>
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="trip-planner-origin">{t("originLabel")}</Label>
            <input
              id="trip-planner-origin"
              name="originQuery"
              className={INPUT_CLASS_NAME}
              autoComplete="street-address"
              value={originQuery}
              onChange={(event) => setOriginQuery(event.target.value)}
              placeholder={t("originPlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-planner-destination">{t("destinationLabel")}</Label>
            <input
              id="trip-planner-destination"
              name="destinationQuery"
              className={INPUT_CLASS_NAME}
              autoComplete="street-address"
              value={destinationQuery}
              onChange={(event) => setDestinationQuery(event.target.value)}
              placeholder={t("destinationPlaceholder")}
              required
            />
          </div>

          <div className="flex items-end">
            <Button
              className="w-full rounded-xl md:w-auto"
              disabled={searchState === "loading"}
              type="submit"
            >
              {searchState === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{t("loading")}</span>
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </div>
        </form>

        {errorMessage ? (
          <p
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
      </section>

      {result ? (
        <section className={cn(PANEL_CLASS_NAME, "space-y-5")} aria-live="polite">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">{t("resultsTitle")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("resultsCount", { count: String(result.parks.length) })}
              </p>
              <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-foreground">{t("originResolvedLabel")}</dt>
                  <dd>{result.origin.label}</dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">{t("destinationResolvedLabel")}</dt>
                  <dd>{result.destination.label}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-white/45 bg-white/74 px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/10 dark:bg-slate-950/46 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Route className="h-4 w-4" aria-hidden="true" />
                <span>{t("routeSummaryTitle")}</span>
              </div>
              <p className="mt-2 text-muted-foreground">
                {t("routeDistance")} {formatRouteDistance(result.route.distanceMeters)}
              </p>
              <p className="text-muted-foreground">
                {t("routeDuration")} {formatRouteDuration(result.route.durationSeconds)}
              </p>
            </div>
          </div>

          {result.parks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/45 bg-white/50 px-4 py-6 text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-950/38">
              {t("noResults")}
            </p>
          ) : (
            <div className="space-y-6">
              <TripPlannerResultsSection
                title={t("sections.notVisited")}
                parks={groupedResults.notVisited}
                statusLabel={t("notVisited")}
              />
              <TripPlannerResultsSection
                title={t("sections.visited")}
                parks={groupedResults.visited}
                statusLabel={t("visited")}
              />
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
};

interface TripPlannerResultsSectionProps {
  parks: TripPlannerParkResult[];
  statusLabel: string;
  title: string;
}

const TripPlannerResultsSection = ({
  parks,
  statusLabel,
  title,
}: TripPlannerResultsSectionProps) => {
  const t = useTranslations("tripPlanner");

  if (parks.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3" aria-labelledby={`trip-planner-section-${title}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 id={`trip-planner-section-${title}`} className="text-lg font-semibold text-foreground">
          {title}
        </h3>
        <span className="text-sm text-muted-foreground">{parks.length}</span>
      </div>

      <ul className="grid gap-3">
        {parks.map((park) => (
          <li key={park.slug}>
            <article className="rounded-[1.35rem] border border-white/45 bg-white/66 p-4 shadow-[0_14px_30px_rgba(148,163,184,0.16)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/48 dark:shadow-[0_20px_40px_rgba(2,6,23,0.3)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/park/${park.slug}`}
                      className="text-base font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {park.name}
                    </Link>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        park.visitedSummary.visited
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                          : "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100",
                      )}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground">{getParkTypeDisplayName(park)}</p>
                  <p className="text-sm text-muted-foreground">{park.address}</p>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground sm:text-right">
                  <p>
                    <span className="font-medium text-foreground">{t("distanceFromRoute")}</span>{" "}
                    {formatDistanceFromRoute(park.distanceFromRouteKm)}
                  </p>
                  {park.visitedSummary.visited ? (
                    <p>
                      <span className="font-medium text-foreground">{t("visitCount")}</span>{" "}
                      {park.visitedSummary.visitCount}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
};
