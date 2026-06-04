"use client";

import { cn } from "@/lib/cn";
import { formatFinnishDate } from "@/lib/fi-date";
import type { VisitWithPark } from "@/lib/parks";
import {
  buildPublicVisitsTimelineModel,
  createParkVisitHref,
  createPublicVisitsHref,
} from "@/lib/public-visits";
import { CalendarRange, Camera, FileText, Footprints, Images, Route } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRef } from "react";

interface PublicVisitsTimelineProps {
  error?: string | null;
  selectedMonth: number | null;
  selectedYear: number | null;
  visits: VisitWithPark[];
}

const FILTER_LINK_CLASS_NAME =
  "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ACTIVE_FILTER_LINK_CLASS_NAME =
  "border-emerald-700/15 bg-[linear-gradient(145deg,#166534_0%,#0f766e_55%,#2563eb_100%)] text-primary-foreground shadow-[0_12px_28px_rgba(37,99,235,0.24)]";
const INACTIVE_FILTER_LINK_CLASS_NAME =
  "border-white/45 bg-white/70 text-foreground/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.52)] hover:bg-white/88 dark:border-white/10 dark:bg-slate-950/52 dark:text-sky-100/78 dark:hover:bg-slate-950/72";

const PublicVisitsTimeline = ({
  error = null,
  selectedMonth,
  selectedYear,
  visits,
}: PublicVisitsTimelineProps) => {
  const t = useTranslations("visits");
  const model = buildPublicVisitsTimelineModel(visits, {
    selectedYear,
    selectedMonth,
  });
  const yearRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const monthRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const visitRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const selectedYearIndex =
    model.selectedYear === null ? 0 : model.availableYears.indexOf(model.selectedYear) + 1;
  const selectedMonthIndex = model.selectedMonth ?? 0;

  const focusYear = (index = selectedYearIndex) => {
    yearRefs.current[index]?.focus();
  };

  const focusMonth = (index = selectedMonthIndex) => {
    monthRefs.current[index]?.focus();
  };

  const focusVisit = (index: number) => {
    visitRefs.current[index]?.focus();
  };

  const focusRefByDelta = (
    refs: Array<HTMLAnchorElement | null>,
    currentIndex: number,
    delta: number,
  ) => {
    const nextIndex = currentIndex + delta;

    if (nextIndex < 0 || nextIndex >= refs.length) {
      return;
    }

    refs[nextIndex]?.focus();
  };

  const handleYearKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusRefByDelta(yearRefs.current, index, 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusRefByDelta(yearRefs.current, index, -1);
      return;
    }

    if (event.key === "ArrowUp") {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (model.selectedYear !== null && monthRefs.current.length > 0) {
        focusMonth();
        return;
      }

      if (visitRefs.current.length > 0) {
        focusVisit(0);
        return;
      }

      focusYear(index);
    }
  };

  const handleMonthKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusRefByDelta(monthRefs.current, index, 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusRefByDelta(monthRefs.current, index, -1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (visitRefs.current.length > 0) {
        focusVisit(0);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusYear();
    }
  };

  const handleVisitKeyDown = (event: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();

    if (event.key === "ArrowDown") {
      if (index < visitRefs.current.length - 1) {
        focusVisit(index + 1);
      }
      return;
    }

    if (index > 0) {
      focusVisit(index - 1);
      return;
    }

    if (model.selectedYear !== null && monthRefs.current.length > 0) {
      focusMonth();
      return;
    }

    focusYear();
  };

  let monthSideIndex = 0;
  let visitFocusIndex = 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
      <section className="rounded-[2rem] border border-white/55 bg-white/66 p-6 shadow-[0_24px_60px_rgba(148,163,184,0.18)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/58 dark:border-white/10 dark:bg-slate-950/52 dark:shadow-[0_28px_64px_rgba(2,6,23,0.34)]">
        <div className="flex flex-col gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-[linear-gradient(145deg,rgba(22,101,52,0.12),rgba(37,99,235,0.12))] px-3 py-1 text-sm font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-emerald-300/15 dark:bg-[linear-gradient(145deg,rgba(22,101,52,0.22),rgba(37,99,235,0.2))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Footprints className="h-4 w-4" aria-hidden="true" />
              <span>{t("eyebrow")}</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {t("description")}
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <section
          className="mt-6 rounded-[2rem] border border-destructive/20 bg-destructive/8 p-5 text-destructive shadow-[0_16px_36px_rgba(190,24,93,0.08)] dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"
          role="alert"
        >
          <h2 className="text-lg font-semibold tracking-tight">{t("errorTitle")}</h2>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      ) : null}

      <section className="mt-6 rounded-[2rem] border border-white/55 bg-white/66 p-5 shadow-[0_24px_60px_rgba(148,163,184,0.18)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/58 dark:border-white/10 dark:bg-slate-950/52 dark:shadow-[0_28px_64px_rgba(2,6,23,0.34)]">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <CalendarRange className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight">{t("filters.title")}</h2>
          <p className="text-sm text-muted-foreground">
            ({model.filteredVisits.length} {t("filters.visibleCount")})
          </p>
        </div>

        <nav aria-label={t("filters.yearsLabel")} className="mt-4 flex flex-wrap gap-2">
          <Link
            href={createPublicVisitsHref({ year: null, month: null })}
            aria-label={t("filters.allYearsLabel")}
            aria-current={model.selectedYear === null ? "page" : undefined}
            className={cn(
              FILTER_LINK_CLASS_NAME,
              model.selectedYear === null
                ? ACTIVE_FILTER_LINK_CLASS_NAME
                : INACTIVE_FILTER_LINK_CLASS_NAME,
            )}
            ref={(element) => {
              yearRefs.current[0] = element;
            }}
            onKeyDown={(event) => handleYearKeyDown(event, 0)}
          >
            {t("filters.all")}
          </Link>
          {model.availableYears.map((year, index) => (
            <Link
              key={year}
              href={createPublicVisitsHref({ year, month: null })}
              aria-current={model.selectedYear === year ? "page" : undefined}
              className={cn(
                FILTER_LINK_CLASS_NAME,
                model.selectedYear === year
                  ? ACTIVE_FILTER_LINK_CLASS_NAME
                  : INACTIVE_FILTER_LINK_CLASS_NAME,
              )}
              ref={(element) => {
                yearRefs.current[index + 1] = element;
              }}
              onKeyDown={(event) => handleYearKeyDown(event, index + 1)}
            >
              {year}
            </Link>
          ))}
        </nav>

        {model.selectedYear !== null ? (
          <nav aria-label={t("filters.monthsLabel")} className="mt-4 flex flex-wrap gap-2">
            <Link
              href={createPublicVisitsHref({ year: model.selectedYear, month: null })}
              aria-label={t("filters.allMonthsLabel")}
              aria-current={model.selectedMonth === null ? "page" : undefined}
              className={cn(
                FILTER_LINK_CLASS_NAME,
                model.selectedMonth === null
                  ? ACTIVE_FILTER_LINK_CLASS_NAME
                  : INACTIVE_FILTER_LINK_CLASS_NAME,
              )}
              ref={(element) => {
                monthRefs.current[0] = element;
              }}
              onKeyDown={(event) => handleMonthKeyDown(event, 0)}
            >
              {t("filters.all")}
            </Link>
            {model.monthOptions.map((month, index) => (
              <Link
                key={month.value}
                href={createPublicVisitsHref({ year: model.selectedYear, month: month.value })}
                aria-current={model.selectedMonth === month.value ? "page" : undefined}
                className={cn(
                  FILTER_LINK_CLASS_NAME,
                  model.selectedMonth === month.value
                    ? ACTIVE_FILTER_LINK_CLASS_NAME
                    : INACTIVE_FILTER_LINK_CLASS_NAME,
                )}
                ref={(element) => {
                  monthRefs.current[index + 1] = element;
                }}
                onKeyDown={(event) => handleMonthKeyDown(event, index + 1)}
              >
                {month.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </section>

      {visits.length === 0 && !error ? (
        <section className="mt-6 rounded-[2rem] border border-dashed border-white/45 bg-white/54 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/40">
          <p className="text-muted-foreground">{t("empty.all")}</p>
        </section>
      ) : null}

      {visits.length > 0 && model.filteredVisits.length === 0 ? (
        <section className="mt-6 rounded-[2rem] border border-dashed border-white/45 bg-white/54 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/40">
          <p className="text-muted-foreground">{t("empty.filtered")}</p>
          <Link
            href="/visits"
            className="mt-4 inline-flex items-center rounded-full border border-white/45 bg-white/72 px-4 py-2 text-sm font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.52)] transition-colors hover:bg-white/88 dark:border-white/10 dark:bg-slate-950/56 dark:hover:bg-slate-950/76"
          >
            {t("filters.reset")}
          </Link>
        </section>
      ) : null}

      {model.filteredVisits.length > 0 ? (
        <div className="relative mt-6 space-y-8 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-px before:-translate-x-1/2 before:bg-[linear-gradient(180deg,rgba(22,101,52,0.42),rgba(37,99,235,0.18),rgba(22,101,52,0.42))] before:content-[''] md:before:left-1/2 md:before:-translate-x-1/2">
          {model.sections.map((section) => (
            <section key={section.year} aria-labelledby={`visits-year-${section.year}`}>
              <div className="flex items-center gap-3 pl-12 pr-4 md:px-0">
                <div className="h-px flex-1 bg-border/70" aria-hidden="true" />
                <h2
                  id={`visits-year-${section.year}`}
                  className="text-xl font-semibold tracking-tight"
                >
                  {section.year}
                </h2>
                <div className="h-px flex-1 bg-border/70" aria-hidden="true" />
              </div>

              <div className="mt-5 space-y-6">
                {section.months.map((monthSection) => {
                  const isLeftMonth = monthSideIndex % 2 === 0;
                  monthSideIndex += 1;

                  return (
                    <section
                      key={`${section.year}-${monthSection.month}`}
                      aria-labelledby={`visits-month-${section.year}-${monthSection.month}`}
                    >
                      <div className="md:grid md:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] md:gap-4">
                        <div
                          className={cn(
                            "flex items-center gap-3 pl-12 pr-4 md:px-0",
                            isLeftMonth ? "md:col-start-1" : "md:col-start-3",
                          )}
                        >
                          <div className="h-px flex-1 bg-border/60 md:hidden" aria-hidden="true" />
                          <h3
                            id={`visits-month-${section.year}-${monthSection.month}`}
                            className="text-center text-base font-semibold uppercase tracking-[0.2em] text-muted-foreground md:text-left"
                          >
                            {monthSection.label}
                          </h3>
                          <div className="h-px flex-1 bg-border/60" aria-hidden="true" />
                        </div>
                      </div>

                      <ol className="relative mt-4 space-y-4 before:absolute before:bottom-0 before:left-4 before:top-0 before:w-px before:-translate-x-1/2 before:bg-[linear-gradient(180deg,rgba(22,101,52,0.38),rgba(37,99,235,0.12))] before:content-[''] md:before:left-1/2 md:before:-translate-x-1/2">
                        {monthSection.visits.map((visit) => {
                          const currentVisitFocusIndex = visitFocusIndex;
                          visitFocusIndex += 1;
                          const hasImages = visit.images.length > 0;
                          const hasNote = Boolean(visit.note?.trim());

                          return (
                            <li
                              key={visit.id}
                              className="relative pl-12 md:grid md:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] md:gap-4 md:pl-0"
                            >
                              <div
                                className={cn(
                                  "md:row-start-1",
                                  isLeftMonth ? "md:col-start-1" : "md:col-start-3",
                                )}
                              >
                                <Link
                                  href={createParkVisitHref({
                                    parkSlug: visit.park.slug,
                                    visitId: visit.id,
                                  })}
                                  aria-label={t("item.openVisit", {
                                    parkName: visit.park.name,
                                    visitedOn: formatFinnishDate(visit.visitedOn),
                                  })}
                                  className="group relative block rounded-[1.8rem] border border-white/45 bg-white/68 p-5 shadow-[0_20px_44px_rgba(148,163,184,0.16)] backdrop-blur-xl transition-colors hover:bg-white/82 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/44 dark:shadow-[0_24px_52px_rgba(2,6,23,0.32)] dark:hover:bg-slate-950/58"
                                  ref={(element) => {
                                    visitRefs.current[currentVisitFocusIndex] = element;
                                  }}
                                  onKeyDown={(event) =>
                                    handleVisitKeyDown(event, currentVisitFocusIndex)
                                  }
                                >
                                  <div className="flex flex-col gap-4">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-primary md:pr-44">
                                        {formatFinnishDate(visit.visitedOn)}
                                      </p>
                                      <h4 className="mt-3 text-xl font-semibold tracking-tight">
                                        {visit.park.name}
                                      </h4>

                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {visit.route ? (
                                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-[linear-gradient(145deg,rgba(22,101,52,0.12),rgba(16,185,129,0.18))] px-2.5 py-1 text-xs font-semibold text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-emerald-300/15 dark:bg-[linear-gradient(145deg,rgba(22,101,52,0.24),rgba(16,185,129,0.16))] dark:text-emerald-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                            <Route className="h-3.5 w-3.5" aria-hidden="true" />
                                            {visit.route}
                                          </span>
                                        ) : null}
                                        {hasNote ? (
                                          <span
                                            aria-label={t("item.note")}
                                            className="inline-flex items-center rounded-full border border-sky-200/70 bg-[linear-gradient(145deg,rgba(22,101,52,0.08),rgba(37,99,235,0.12))] p-1.5 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-sky-300/15 dark:bg-[linear-gradient(145deg,rgba(22,101,52,0.18),rgba(37,99,235,0.16))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                                            role="img"
                                          >
                                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                          </span>
                                        ) : null}
                                        {hasImages ? (
                                          <span
                                            aria-label={t("item.imageCount", {
                                              count: visit.images.length,
                                            })}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/70 bg-[linear-gradient(145deg,rgba(37,99,235,0.12),rgba(14,165,233,0.16))] px-2.5 py-1 text-xs font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-sky-300/15 dark:bg-[linear-gradient(145deg,rgba(37,99,235,0.18),rgba(14,165,233,0.14))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                                            role="img"
                                          >
                                            <Images className="h-3.5 w-3.5" aria-hidden="true" />
                                            {visit.images.length}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>

                                    <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-white/45 bg-white/72 px-3 py-1 text-xs font-medium text-foreground/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.48)] md:absolute md:right-5 md:top-5 md:whitespace-nowrap dark:border-white/10 dark:bg-slate-950/56 dark:text-sky-100/72 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                                      <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                                      {t("item.viewVisit")}
                                    </span>
                                  </div>
                                </Link>
                              </div>

                              <div className="pointer-events-none absolute bottom-0 left-4 top-0 flex w-4 -translate-x-1/2 justify-center md:static md:col-start-2 md:row-start-1 md:w-auto md:translate-x-0">
                                <span
                                  aria-hidden="true"
                                  className="relative top-5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary shadow-[0_0_0_4px_rgba(255,255,255,0.75)] dark:shadow-[0_0_0_4px_rgba(2,6,23,0.72)]"
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export { PublicVisitsTimeline };
