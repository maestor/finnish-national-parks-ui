"use client";

import { CalendarRange, Camera, MapPinned, Mountain, Route, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  PUBLIC_EMPTY_STATE_PANEL_CLASS_NAME,
  PUBLIC_PANEL_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { useStoryProgressNavigation } from "@/components/story/use-story-progress-navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type {
  DateRangeReviewCard,
  DateRangeReviewOverview,
  DateRangeReviewStory as DateRangeReviewStoryData,
} from "@/lib/date-range-review";
import { formatFinnishDate, formatFinnishDateRange } from "@/lib/fi-date";
import { appRoutes } from "@/lib/routes";

interface DateRangeReviewStoryProps {
  headingLevel?: 1 | 2;
  mode: "preview" | "public";
  overview: DateRangeReviewOverview;
  publishedAt?: string | null;
  story: DateRangeReviewStoryData;
}

const getImageDimensions = (image: { fullHeight: number | null; fullWidth: number | null }) => ({
  height: image.fullHeight ?? 1200,
  width: image.fullWidth ?? 1800,
});

const getCardKey = (card: DateRangeReviewCard) => {
  switch (card.kind) {
    case "intro":
      return `intro-${card.name}-${card.dateRange.startDate}-${card.dateRange.endDate}`;
    case "photo-highlight":
      return `photo-${card.visit?.id ?? "none"}-${card.totalImageCount}`;
    case "new-parks":
      return `new-${card.parks.map((parkMoment) => parkMoment.park.slug).join("-")}`;
    case "revisited-parks":
      return `revisited-${card.parks
        .map((parkMoment) => `${parkMoment.park.slug}-${parkMoment.visitedOn}`)
        .join("-")}`;
    case "trip-summary":
      return `trip-${card.trip.id}`;
  }
};

const getSummaryItems = (
  summary: DateRangeReviewStoryData["summary"],
  t: (key: string, values?: Record<string, string | number>) => string,
) => [
  { label: t("stats.newNationalParks"), value: summary.newNationalParkCount },
  { label: t("stats.revisitedParks"), value: summary.revisitedParkCount },
  { label: t("stats.parks"), value: summary.distinctParkCount },
  { label: t("stats.images"), value: summary.imageCount },
];

const CARD_THEME_CLASS_NAMES: Record<DateRangeReviewCard["kind"], string> = {
  intro: "bg-[linear-gradient(145deg,#14532d_0%,#0f766e_52%,#1d4ed8_100%)] text-primary-foreground",
  "new-parks":
    "bg-[linear-gradient(145deg,rgba(20,83,45,0.98),rgba(64,94,16,0.86),rgba(12,74,110,0.8))] text-primary-foreground",
  "photo-highlight":
    "bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(14,116,144,0.86),rgba(22,101,52,0.84))] text-primary-foreground",
  "revisited-parks":
    "bg-[linear-gradient(145deg,rgba(20,83,45,0.98),rgba(12,74,110,0.88),rgba(21,128,61,0.84))] text-primary-foreground",
  "trip-summary":
    "bg-[linear-gradient(145deg,rgba(68,64,60,0.98),rgba(22,101,52,0.84),rgba(14,116,144,0.82))] text-primary-foreground",
};

const MetricTile = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-[1.45rem] border border-white/16 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
    <p className="text-xs uppercase tracking-[0.18em] text-primary-foreground/70">{label}</p>
    <p className="mt-2 text-3xl font-black tracking-tight text-primary-foreground">{value}</p>
  </div>
);

const ReviewImage = ({
  alt,
  image,
}: {
  alt: string;
  image: {
    alt: string | null;
    fullHeight: number | null;
    fullUrl: string;
    fullWidth: number | null;
  };
}) => {
  const dimensions = getImageDimensions(image);

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/18 bg-white/10 shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
      <Image
        alt={image.alt ?? alt}
        className="h-72 w-full object-cover"
        height={dimensions.height}
        src={image.fullUrl}
        unoptimized
        width={dimensions.width}
      />
    </div>
  );
};

const StoryCard = ({
  children,
  kind,
}: {
  children: ReactNode;
  kind: DateRangeReviewCard["kind"];
}) => (
  <section className={cn(PUBLIC_PANEL_CLASS_NAME, CARD_THEME_CLASS_NAMES[kind], "overflow-hidden")}>
    <div className="space-y-6">{children}</div>
  </section>
);

const getScrollBehavior = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "auto" as const;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
};

export const DateRangeReviewStory = ({
  headingLevel = 2,
  mode,
  overview,
  story,
}: DateRangeReviewStoryProps) => {
  const t = useTranslations("dateRangeReview");
  const HeadingTag = headingLevel === 1 ? "h1" : "h2";
  const cards = story.cards;
  const cardKeys = cards.map((card) => getCardKey(card));
  const {
    activeIndex,
    handleStepButtonNavigation,
    navigationRef,
    progressButtonRefs,
    scrollToCard,
    sectionRefs,
    storyRef,
  } = useStoryProgressNavigation({
    cardCount: cards.length,
    getScrollBehavior,
  });

  if (story.summary.visitCount === 0) {
    return (
      <div data-testid="date-range-review-story" className="space-y-5">
        <section className={PUBLIC_EMPTY_STATE_PANEL_CLASS_NAME}>
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-[linear-gradient(145deg,rgba(22,101,52,0.12),rgba(37,99,235,0.12))] px-3 py-1 text-sm font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-emerald-300/15 dark:bg-[linear-gradient(145deg,rgba(22,101,52,0.22),rgba(37,99,235,0.2))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              {t("eyebrow")}
            </div>
            <HeadingTag className="text-3xl font-bold tracking-tight">{overview.name}</HeadingTag>
            <p className="text-sm leading-6 text-muted-foreground">{t("story.emptyDescription")}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      ref={storyRef}
      data-testid="date-range-review-story"
      className={cn("space-y-5", mode === "public" && "pb-24 sm:pb-32")}
    >
      <div
        ref={navigationRef}
        className={cn(PUBLIC_PANEL_CLASS_NAME, "sticky z-20 px-4 py-4 sm:px-5")}
        style={{ top: "var(--page-sticky-nav-top, 0rem)" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground sm:text-base">
              {t("story.progress", {
                current: activeIndex + 1,
                name: overview.name,
                total: cards.length,
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(event) => {
                handleStepButtonNavigation(Math.max(0, activeIndex - 1), event.currentTarget);
              }}
              disabled={activeIndex === 0}
            >
              {t("story.previous")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={(event) => {
                handleStepButtonNavigation(
                  Math.min(cards.length - 1, activeIndex + 1),
                  event.currentTarget,
                );
              }}
              disabled={activeIndex === cards.length - 1}
            >
              {t("story.next")}
            </Button>
          </div>
        </div>

        <nav className="mt-4" aria-label={t("story.progressNavigator")}>
          <div className="flex gap-2">
            {cards.map((_card, index) => (
              <button
                key={cardKeys[index]}
                ref={(element) => {
                  progressButtonRefs.current[index] = element;
                }}
                type="button"
                onClick={() => scrollToCard(index)}
                aria-label={t("story.goToCard", { current: index + 1, total: cards.length })}
                aria-current={index === activeIndex ? "step" : undefined}
                className={cn(
                  "relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/16 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  index === activeIndex && "shadow-[0_0_18px_rgba(74,222,128,0.32)]",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-emerald-300 via-primary to-emerald-100 transition-all duration-500 motion-safe:duration-700",
                    index === activeIndex ? "w-full" : "w-0",
                  )}
                />
              </button>
            ))}
          </div>
        </nav>
      </div>

      <div className="space-y-5">
        {cards.map((card, index) => {
          if (card.kind === "intro") {
            return (
              <StoryCard key={cardKeys[index]} kind={card.kind}>
                <section
                  ref={(element) => {
                    sectionRefs.current[index] = element;
                  }}
                  data-card-index={index}
                  data-testid={`date-range-review-story-card-${index}`}
                >
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/28 bg-black/16 px-3 py-1 text-sm font-medium text-primary-foreground/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-sm">
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        <span>{t("eyebrow")}</span>
                      </div>
                      <HeadingTag className="text-4xl font-black tracking-tight sm:text-5xl">
                        {card.name}
                      </HeadingTag>
                      <p className="text-sm leading-6 text-primary-foreground/82 sm:text-base">
                        {t("story.introCaption")}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-primary-foreground/78">
                        <span className="inline-flex items-center gap-2">
                          <CalendarRange className="h-4 w-4" aria-hidden="true" />
                          {formatFinnishDateRange(card.dateRange.startDate, card.dateRange.endDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end">
                    <div className="rounded-[1.8rem] border border-white/16 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                        {t("story.primaryStatLabel")}
                      </p>
                      <div className="mt-4 flex items-end gap-3">
                        <p className="text-7xl font-black tracking-[-0.04em] text-primary-foreground sm:text-8xl">
                          {card.primaryStat.value}
                        </p>
                        <p className="pb-2 text-sm font-semibold uppercase tracking-[0.22em] text-primary-foreground/72">
                          {t("story.visitCountLabel")}
                        </p>
                      </div>
                      <div className="mt-5 border-t border-white/16 pt-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                          {t("stats.trips")}
                        </p>
                        <div className="mt-2 flex items-end gap-3">
                          <p className="text-4xl font-black tracking-tight text-primary-foreground sm:text-5xl">
                            {card.tripCount}
                          </p>
                          <p className="pb-1 text-sm font-semibold uppercase tracking-[0.22em] text-primary-foreground/72">
                            {t("story.tripCountLabel")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {getSummaryItems(story.summary, t).map((item) => (
                        <MetricTile key={item.label} label={item.label} value={item.value} />
                      ))}
                    </div>
                  </div>
                </section>
              </StoryCard>
            );
          }

          if (card.kind === "photo-highlight") {
            return (
              <StoryCard key={cardKeys[index]} kind={card.kind}>
                <section
                  ref={(element) => {
                    sectionRefs.current[index] = element;
                  }}
                  data-card-index={index}
                  data-testid={`date-range-review-story-card-${index}`}
                >
                  <div className="space-y-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-white/18 bg-white/10">
                      <Camera className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
                        {t("story.photoTitle")}
                      </h3>
                      <p className="text-sm leading-6 text-primary-foreground/82 sm:text-base">
                        {t("story.photoCaption", { count: card.totalImageCount })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
                    {card.featuredImage !== null && (
                      <ReviewImage
                        alt={
                          card.visit
                            ? `${card.visit.park.name}, ${formatFinnishDate(card.visit.visitedOn)}`
                            : overview.name
                        }
                        image={card.featuredImage}
                      />
                    )}

                    <div className="space-y-3">
                      {card.visit ? (
                        <>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
                            {t("story.photoVisitTitle")}
                          </p>
                          <div className="space-y-2">
                            <Link
                              href={appRoutes.park(card.visit.park.slug)}
                              className="text-2xl font-bold tracking-tight hover:underline"
                            >
                              {card.visit.park.name}
                            </Link>
                            <p className="text-sm text-primary-foreground/78">
                              {t("story.newParkVisitedOn", {
                                date: formatFinnishDate(card.visit.visitedOn),
                              })}
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <MetricTile
                              label={t("story.photoVisitCount")}
                              value={card.visit.imageCount}
                            />
                            <MetricTile
                              label={t("story.photoTotalCount")}
                              value={card.totalImageCount}
                            />
                          </div>
                          {card.visit.route !== null && (
                            <p className="text-sm text-primary-foreground/78">
                              <span className="font-semibold">{t("story.routeLabel")}:</span>{" "}
                              {card.visit.route}
                            </p>
                          )}
                          {card.visit.trip !== null && (
                            <p className="text-sm text-primary-foreground/78">
                              <span className="font-semibold">{t("story.tripLabel")}:</span>{" "}
                              <Link
                                href={appRoutes.trip(card.visit.trip.slug)}
                                className="hover:underline"
                              >
                                {card.visit.trip.name}
                              </Link>
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm leading-6 text-primary-foreground/82">
                          {t("story.photoFallback")}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              </StoryCard>
            );
          }

          if (card.kind === "new-parks") {
            return (
              <StoryCard key={cardKeys[index]} kind={card.kind}>
                <section
                  ref={(element) => {
                    sectionRefs.current[index] = element;
                  }}
                  data-card-index={index}
                  data-testid={`date-range-review-story-card-${index}`}
                >
                  <div className="space-y-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-white/18 bg-white/10">
                      <Mountain className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
                        {t("story.newParksTitle")}
                      </h3>
                      <p className="text-sm leading-6 text-primary-foreground/82 sm:text-base">
                        {t("story.newParksCaption")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {card.parks.map((park) => (
                      <article
                        key={`${park.park.slug}-${park.visitedOn}`}
                        className="space-y-3 rounded-[1.55rem] border border-white/18 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                      >
                        {park.featuredImage !== null && (
                          <ReviewImage
                            alt={`${park.park.name}, ${formatFinnishDate(park.visitedOn)}`}
                            image={park.featuredImage}
                          />
                        )}
                        <div className="space-y-2">
                          <Link
                            href={appRoutes.park(park.park.slug)}
                            className="text-xl font-bold tracking-tight hover:underline"
                          >
                            {park.park.name}
                          </Link>
                          <p className="text-sm text-primary-foreground/78">
                            {t("story.newParkVisitedOn", {
                              date: formatFinnishDate(park.visitedOn),
                            })}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </StoryCard>
            );
          }

          if (card.kind === "revisited-parks") {
            return (
              <StoryCard key={cardKeys[index]} kind={card.kind}>
                <section
                  ref={(element) => {
                    sectionRefs.current[index] = element;
                  }}
                  data-card-index={index}
                  data-testid={`date-range-review-story-card-${index}`}
                >
                  <div className="space-y-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-white/18 bg-white/10">
                      <MapPinned className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
                        {t("story.revisitedParksTitle")}
                      </h3>
                      <p className="text-sm leading-6 text-primary-foreground/82 sm:text-base">
                        {t("story.revisitedParksCaption")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {card.parks.map((park) => (
                      <article
                        key={`${park.park.slug}-${park.visitedOn}`}
                        className="space-y-3 rounded-[1.55rem] border border-white/18 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                      >
                        {park.featuredImage !== null && (
                          <ReviewImage
                            alt={`${park.park.name}, ${formatFinnishDate(park.visitedOn)}`}
                            image={park.featuredImage}
                          />
                        )}
                        <div className="space-y-2">
                          <Link
                            href={appRoutes.park(park.park.slug)}
                            className="text-xl font-bold tracking-tight hover:underline"
                          >
                            {park.park.name}
                          </Link>
                          <p className="text-sm text-primary-foreground/78">
                            {t("story.newParkVisitedOn", {
                              date: formatFinnishDate(park.visitedOn),
                            })}
                          </p>
                          <p className="text-sm text-primary-foreground/78">
                            {t("story.revisitedParkPreviousVisit", {
                              date: formatFinnishDate(park.previousVisitDate),
                            })}
                          </p>
                          <p className="text-sm text-primary-foreground/78">
                            {t("story.revisitedParkTotalVisits", {
                              count: park.revisitCount + 1,
                            })}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </StoryCard>
            );
          }

          return (
            <StoryCard key={cardKeys[index]} kind={card.kind}>
              <section
                ref={(element) => {
                  sectionRefs.current[index] = element;
                }}
                data-card-index={index}
                data-testid={`date-range-review-story-card-${index}`}
              >
                <div className="space-y-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-white/18 bg-white/10">
                    <Route className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
                      <Link href={appRoutes.trip(card.trip.slug)} className="hover:underline">
                        {t("story.tripSummaryTitle", { name: card.trip.name })}
                      </Link>
                    </h3>
                    {card.trip.dateRange !== null && (
                      <p className="text-sm leading-6 text-primary-foreground/82 sm:text-base">
                        {formatFinnishDateRange(card.trip.dateRange.start, card.trip.dateRange.end)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
                  {card.featuredImage !== null && (
                    <ReviewImage alt={card.trip.name} image={card.featuredImage} />
                  )}

                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MetricTile
                        label={t("story.tripSummaryVisits")}
                        value={card.trip.visitCount}
                      />
                      <MetricTile
                        label={t("story.tripSummaryImages")}
                        value={card.trip.imageCount}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </StoryCard>
          );
        })}
      </div>
    </div>
  );
};
