"use client";

import {
  CalendarRange,
  Camera,
  Footprints,
  MapPinned,
  Mountain,
  Route,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import {
  PUBLIC_EMPTY_STATE_PANEL_CLASS_NAME,
  PUBLIC_PANEL_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { ParkTypeBadge } from "@/components/park/park-type-badge";
import {
  getReviewStoryParkGridClassName,
  ReviewStoryFooter,
  ReviewStoryPlaceCard,
  ReviewStorySectionHeader,
} from "@/components/story/review-story-shared";
import { useStoryProgressNavigation } from "@/components/story/use-story-progress-navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type {
  DateRangeReviewCard,
  DateRangeReviewOverview,
  DateRangeReviewStory as DateRangeReviewStoryData,
  DateRangeReviewStoryVisit,
} from "@/lib/date-range-review";
import { formatFinnishDate, formatFinnishDateRange, formatFinnishLongDate } from "@/lib/fi-date";
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
    case "other-visits":
      return `other-${card.visits
        .map((visit) => `${visit.park.slug}-${visit.visitedOn}`)
        .join("-")}`;
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

const getTripSummaryBadge = (
  cards: DateRangeReviewCard[],
  currentIndex: number,
  t: (key: string, values?: Record<string, string | number>) => string,
) => {
  const tripCount = cards.filter((card) => card.kind === "trip-summary").length;

  if (tripCount <= 1) {
    return t("story.tripLabel");
  }

  const tripNumber = cards
    .slice(0, currentIndex + 1)
    .filter((card) => card.kind === "trip-summary").length;

  return `${tripNumber}. ${t("story.tripLabel")}`;
};

const DENSE_PARK_GRID_THRESHOLD = 7;
const DENSE_TRIP_VISIT_LIST_THRESHOLD = 8;

const getDateRangeReviewParkGridClassName = (count: number) => {
  if (count >= DENSE_PARK_GRID_THRESHOLD) {
    return "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  }

  return getReviewStoryParkGridClassName(count);
};

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
  "other-visits":
    "bg-[linear-gradient(145deg,rgba(49,46,129,0.98),rgba(21,94,117,0.9),rgba(20,83,45,0.82))] text-primary-foreground",
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
  imageClassName,
}: {
  alt: string;
  image: {
    alt: string | null;
    fullHeight: number | null;
    fullUrl: string;
    fullWidth: number | null;
  };
  imageClassName?: string;
}) => {
  const dimensions = getImageDimensions(image);

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/18 bg-white/10 shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
      <Image
        alt={image.alt ?? alt}
        className={cn("h-72 w-full object-cover", imageClassName)}
        height={dimensions.height}
        src={image.fullUrl}
        unoptimized
        width={dimensions.width}
      />
    </div>
  );
};

const STORY_BLOCK_REVEAL_CLASS_NAME = "year-review-reveal motion-safe:animate-year-review-enter";

const STORY_MEDIA_REVEAL_CLASS_NAME =
  "year-review-media-reveal motion-safe:animate-year-review-media";

const STORY_BLOCK_PENDING_CLASS_NAME = "year-review-reveal";

const STORY_MEDIA_PENDING_CLASS_NAME = "year-review-media-reveal";

const getRevealStyle = (shouldAnimate: boolean, delayMs: number): CSSProperties | undefined =>
  shouldAnimate ? { animationDelay: `${delayMs}ms` } : undefined;

const getRevealClassName = (shouldAnimate: boolean) => {
  if (shouldAnimate) {
    return STORY_BLOCK_REVEAL_CLASS_NAME;
  }

  return STORY_BLOCK_PENDING_CLASS_NAME;
};

const getMediaRevealClassName = (shouldAnimate: boolean) => {
  if (shouldAnimate) {
    return STORY_MEDIA_REVEAL_CLASS_NAME;
  }

  return STORY_MEDIA_PENDING_CLASS_NAME;
};

const ReviewVisitList = ({
  compact = false,
  denseColumns = false,
  title,
  visits,
}: {
  compact?: boolean;
  denseColumns?: boolean;
  title: string;
  visits?: DateRangeReviewStoryVisit[];
}) => {
  const normalizedVisits = visits ?? [];

  if (normalizedVisits.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
        {title}
      </p>
      <ul
        aria-label={title}
        className={cn("space-y-2.5", denseColumns && "grid gap-2.5 space-y-0 xl:grid-cols-2")}
      >
        {normalizedVisits.map((visit) => (
          <li
            key={`${visit.park.slug}-${visit.visitedOn}`}
            className={cn(
              "rounded-3xl border border-white/18 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
              compact ? "px-3 py-2.5" : "px-3.5 py-3",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className={cn(compact ? "space-y-1" : "space-y-1.5")}>
                <Link
                  href={appRoutes.park(visit.park.slug)}
                  className={cn(
                    "font-semibold tracking-tight hover:underline",
                    compact ? "text-sm leading-5" : "text-base",
                  )}
                >
                  {visit.park.name}
                </Link>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ParkTypeBadge
                    className={cn(
                      "border-white/28 bg-white/14 text-primary-foreground shadow-none dark:border-white/28 dark:bg-white/14",
                      compact ? "px-1.5 py-0.5 text-[0.6875rem]" : "px-2 py-0.5 text-xs",
                    )}
                    label={visit.park.typeLabel}
                  />
                  <span
                    className={cn("text-primary-foreground/78", compact ? "text-xs" : "text-sm")}
                  >
                    {formatFinnishDate(visit.visitedOn)}
                  </span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const StoryCard = ({
  active,
  children,
  entryState,
  kind,
}: {
  active: boolean;
  children: ReactNode;
  entryState: "entry" | "seen" | "upcoming";
  kind: DateRangeReviewCard["kind"];
}) => (
  <section
    data-story-entry-state={entryState}
    className={cn(
      PUBLIC_PANEL_CLASS_NAME,
      CARD_THEME_CLASS_NAMES[kind],
      "group relative isolate overflow-hidden",
    )}
  >
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={cn(
          "absolute -top-12 right-0 h-44 w-44 rounded-full bg-white/12 blur-3xl transition-opacity duration-500",
          active ? "opacity-100 motion-safe:animate-year-review-float" : "opacity-55",
        )}
      />
      <div
        className={cn(
          "absolute bottom-0 left-0 h-52 w-52 rounded-full bg-emerald-300/18 blur-3xl transition-opacity duration-500",
          active ? "opacity-100 motion-safe:animate-year-review-glow" : "opacity-45",
        )}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-white/45" />
    </div>
    <div className="relative z-10 space-y-6">{children}</div>
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
  const layoutT = useTranslations("layout");
  const HeadingTag = headingLevel === 1 ? "h1" : "h2";
  const cards = story.cards;
  const cardKeys = cards.map((card) => getCardKey(card));
  const firstCardKey = cardKeys[0] ?? null;
  const [entryAnimationCardKey, setEntryAnimationCardKey] = useState<string | null>(firstCardKey);
  const seenCardKeysRef = useRef<Set<string>>(new Set());
  const {
    activeIndex,
    handleStepButtonNavigation,
    navigationRef,
    progressButtonRefs,
    scrollToCard,
    sectionRefs,
    storyRef,
    visibleIndex,
  } = useStoryProgressNavigation({
    cardCount: cards.length,
    getScrollBehavior,
  });
  const currentVisibleCardKey = cardKeys[visibleIndex] ?? null;

  useEffect(() => {
    seenCardKeysRef.current = new Set();
    setEntryAnimationCardKey(firstCardKey);
  }, [firstCardKey]);

  useEffect(() => {
    if (!currentVisibleCardKey) {
      setEntryAnimationCardKey(null);
      return;
    }

    if (!seenCardKeysRef.current.has(currentVisibleCardKey)) {
      seenCardKeysRef.current.add(currentVisibleCardKey);
      setEntryAnimationCardKey(currentVisibleCardKey);
      return;
    }

    setEntryAnimationCardKey((previousKey) =>
      previousKey === currentVisibleCardKey ? previousKey : null,
    );
  }, [currentVisibleCardKey]);

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
          const cardKey = cardKeys[index];
          const shouldAnimateCardEntry = entryAnimationCardKey === cardKey;
          const hasCardBeenSeen = shouldAnimateCardEntry || seenCardKeysRef.current.has(cardKey);
          const entryState = shouldAnimateCardEntry
            ? "entry"
            : hasCardBeenSeen
              ? "seen"
              : "upcoming";

          if (card.kind === "intro") {
            return (
              <StoryCard
                key={cardKeys[index]}
                active={index === activeIndex}
                entryState={entryState}
                kind={card.kind}
              >
                <section
                  ref={(element) => {
                    sectionRefs.current[index] = element;
                  }}
                  data-card-index={index}
                  data-story-entry-state={entryState}
                  data-testid={`date-range-review-story-card-${index}`}
                >
                  <div
                    className={cn("space-y-4", getRevealClassName(shouldAnimateCardEntry))}
                    style={getRevealStyle(shouldAnimateCardEntry, 0)}
                  >
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

                  <div
                    className={cn(
                      "mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end",
                      getRevealClassName(shouldAnimateCardEntry),
                    )}
                    style={getRevealStyle(shouldAnimateCardEntry, 160)}
                  >
                    <div className="rounded-[1.8rem] border border-white/16 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                        {t("story.primaryStatLabel")}
                      </p>
                      <div className="mt-4 flex items-end gap-3">
                        <p className="text-7xl font-black tracking-[-0.04em] text-primary-foreground sm:text-8xl">
                          {card.primaryStat.value}
                        </p>
                        <p className="pb-2 text-sm font-semibold uppercase tracking-[0.22em] text-primary-foreground/72">
                          {t("story.visitCountLabel", { count: card.primaryStat.value })}
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
                            {t("story.tripCountLabel", { count: card.tripCount })}
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
              <StoryCard
                key={cardKeys[index]}
                active={index === activeIndex}
                entryState={entryState}
                kind={card.kind}
              >
                <section
                  ref={(element) => {
                    sectionRefs.current[index] = element;
                  }}
                  data-card-index={index}
                  data-story-entry-state={entryState}
                  data-testid={`date-range-review-story-card-${index}`}
                >
                  <div
                    className={getRevealClassName(shouldAnimateCardEntry)}
                    style={getRevealStyle(shouldAnimateCardEntry, 0)}
                  >
                    <ReviewStorySectionHeader
                      badge={t("story.photoTitle")}
                      icon={<Camera className="h-5 w-5" aria-hidden="true" />}
                      title={
                        <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
                          {t("story.photoHeading")}
                        </h3>
                      }
                      caption={t("story.photoCaption", { count: card.totalImageCount })}
                    />
                  </div>

                  <div
                    className={cn(
                      "mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start",
                      getRevealClassName(shouldAnimateCardEntry),
                    )}
                    style={getRevealStyle(shouldAnimateCardEntry, 180)}
                  >
                    {card.featuredImage !== null && (
                      <div
                        className={getMediaRevealClassName(shouldAnimateCardEntry)}
                        style={getRevealStyle(shouldAnimateCardEntry, 260)}
                      >
                        <ReviewImage
                          alt={
                            card.visit
                              ? `${card.visit.park.name}, ${formatFinnishDate(card.visit.visitedOn)}`
                              : overview.name
                          }
                          image={card.featuredImage}
                        />
                      </div>
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
                              {formatFinnishDate(card.visit.visitedOn)}
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
            const usesDenseParkGrid = card.parks.length >= DENSE_PARK_GRID_THRESHOLD;

            return (
              <StoryCard
                key={cardKeys[index]}
                active={index === activeIndex}
                entryState={entryState}
                kind={card.kind}
              >
                <section
                  ref={(element) => {
                    sectionRefs.current[index] = element;
                  }}
                  data-card-index={index}
                  data-story-entry-state={entryState}
                  data-testid={`date-range-review-story-card-${index}`}
                >
                  <div
                    className={getRevealClassName(shouldAnimateCardEntry)}
                    style={getRevealStyle(shouldAnimateCardEntry, 0)}
                  >
                    <ReviewStorySectionHeader
                      badge={t("story.newParksTitle")}
                      icon={<Mountain className="h-5 w-5" aria-hidden="true" />}
                      title={
                        <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
                          {t("story.newParksHeading", { count: card.parks.length })}
                        </h3>
                      }
                      caption={t("story.newParksCaption")}
                    />
                  </div>

                  <div
                    data-layout={usesDenseParkGrid ? "dense" : "default"}
                    data-testid={`date-range-review-park-grid-${index}`}
                    className={cn("mt-6", getDateRangeReviewParkGridClassName(card.parks.length))}
                  >
                    {card.parks.map((park, parkIndex) => (
                      <ReviewStoryPlaceCard
                        key={`${park.park.slug}-${park.visitedOn}`}
                        href={appRoutes.park(park.park.slug)}
                        image={
                          park.featuredImage !== null ? (
                            <ReviewImage
                              alt={`${park.park.name}, ${formatFinnishLongDate(park.visitedOn)}`}
                              image={park.featuredImage}
                              imageClassName={usesDenseParkGrid ? "h-40 sm:h-44" : undefined}
                            />
                          ) : undefined
                        }
                        name={park.park.name}
                        dateText={formatFinnishLongDate(park.visitedOn)}
                        className={cn(
                          "border-white/18 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
                          getMediaRevealClassName(shouldAnimateCardEntry),
                        )}
                        style={getRevealStyle(shouldAnimateCardEntry, 180 + parkIndex * 90)}
                        contentClassName={usesDenseParkGrid ? "space-y-2 p-3.5" : "space-y-2 p-4"}
                        linkClassName={
                          usesDenseParkGrid
                            ? "text-lg font-bold leading-snug tracking-tight"
                            : "text-xl font-bold tracking-tight"
                        }
                      />
                    ))}
                  </div>
                </section>
              </StoryCard>
            );
          }

          if (card.kind === "revisited-parks") {
            const usesDenseParkGrid = card.parks.length >= DENSE_PARK_GRID_THRESHOLD;

            return (
              <StoryCard
                key={cardKeys[index]}
                active={index === activeIndex}
                entryState={entryState}
                kind={card.kind}
              >
                <section
                  ref={(element) => {
                    sectionRefs.current[index] = element;
                  }}
                  data-card-index={index}
                  data-story-entry-state={entryState}
                  data-testid={`date-range-review-story-card-${index}`}
                >
                  <div
                    className={getRevealClassName(shouldAnimateCardEntry)}
                    style={getRevealStyle(shouldAnimateCardEntry, 0)}
                  >
                    <ReviewStorySectionHeader
                      badge={t("story.revisitedParksBadge")}
                      icon={<MapPinned className="h-5 w-5" aria-hidden="true" />}
                      title={
                        <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
                          {t("story.revisitedParksTitle")}
                        </h3>
                      }
                      caption={t("story.revisitedParksCaption")}
                    />
                  </div>

                  <div
                    data-layout={usesDenseParkGrid ? "dense" : "default"}
                    data-testid={`date-range-review-park-grid-${index}`}
                    className={cn("mt-6", getDateRangeReviewParkGridClassName(card.parks.length))}
                  >
                    {card.parks.map((park, parkIndex) => (
                      <ReviewStoryPlaceCard
                        key={`${park.park.slug}-${park.visitedOn}`}
                        href={appRoutes.park(park.park.slug)}
                        image={
                          park.featuredImage !== null ? (
                            <ReviewImage
                              alt={`${park.park.name}, ${formatFinnishLongDate(park.visitedOn)}`}
                              image={park.featuredImage}
                              imageClassName={usesDenseParkGrid ? "h-40 sm:h-44" : undefined}
                            />
                          ) : undefined
                        }
                        name={park.park.name}
                        dateText={formatFinnishLongDate(park.visitedOn)}
                        extraContent={
                          <>
                            <p className="text-sm text-primary-foreground/78">
                              {t("story.revisitedParkPreviousVisit", {
                                date: formatFinnishLongDate(park.previousVisitDate),
                              })}
                            </p>
                            <p className="text-sm text-primary-foreground/78">
                              {t("story.revisitedParkTotalVisits", {
                                count: park.revisitCount + 1,
                              })}
                            </p>
                          </>
                        }
                        className={cn(
                          "border-white/18 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
                          getMediaRevealClassName(shouldAnimateCardEntry),
                        )}
                        style={getRevealStyle(shouldAnimateCardEntry, 180 + parkIndex * 90)}
                        contentClassName={usesDenseParkGrid ? "space-y-2 p-3.5" : "space-y-2 p-4"}
                        linkClassName={
                          usesDenseParkGrid
                            ? "text-lg font-bold leading-snug tracking-tight"
                            : "text-xl font-bold tracking-tight"
                        }
                      />
                    ))}
                  </div>
                </section>
              </StoryCard>
            );
          }

          if (card.kind === "trip-summary") {
            const tripVisits = card.trip.visits ?? [];
            const usesDenseTripLayout = tripVisits.length >= DENSE_TRIP_VISIT_LIST_THRESHOLD;

            return (
              <StoryCard
                key={cardKeys[index]}
                active={index === activeIndex}
                entryState={entryState}
                kind={card.kind}
              >
                <section
                  ref={(element) => {
                    sectionRefs.current[index] = element;
                  }}
                  data-card-index={index}
                  data-testid={`date-range-review-story-card-${index}`}
                >
                  <div
                    className={getRevealClassName(shouldAnimateCardEntry)}
                    style={getRevealStyle(shouldAnimateCardEntry, 0)}
                  >
                    <ReviewStorySectionHeader
                      badge={getTripSummaryBadge(cards, index, t)}
                      icon={<Route className="h-5 w-5" aria-hidden="true" />}
                      title={
                        <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
                          <Link href={appRoutes.trip(card.trip.slug)} className="hover:underline">
                            {card.trip.name}
                          </Link>
                        </h3>
                      }
                      caption={
                        card.trip.dateRange !== null
                          ? formatFinnishDateRange(
                              card.trip.dateRange.start,
                              card.trip.dateRange.end,
                            )
                          : undefined
                      }
                    />
                  </div>

                  {!usesDenseTripLayout && (
                    <div
                      data-layout="default"
                      data-testid={`date-range-review-trip-layout-${index}`}
                      className={cn(
                        "mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start",
                        getRevealClassName(shouldAnimateCardEntry),
                      )}
                      style={getRevealStyle(shouldAnimateCardEntry, 180)}
                    >
                      {card.featuredImage !== null && (
                        <div
                          className={getMediaRevealClassName(shouldAnimateCardEntry)}
                          style={getRevealStyle(shouldAnimateCardEntry, 260)}
                        >
                          <ReviewImage alt={card.trip.name} image={card.featuredImage} />
                        </div>
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
                        {tripVisits.length > 0 && (
                          <ReviewVisitList
                            title={t("story.tripSummaryVisitListTitle")}
                            visits={tripVisits}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {usesDenseTripLayout && (
                    <div
                      data-layout="dense"
                      data-testid={`date-range-review-trip-layout-${index}`}
                      className={cn("mt-6 space-y-5", getRevealClassName(shouldAnimateCardEntry))}
                      style={getRevealStyle(shouldAnimateCardEntry, 180)}
                    >
                      {card.featuredImage !== null && (
                        <div
                          className={getMediaRevealClassName(shouldAnimateCardEntry)}
                          style={getRevealStyle(shouldAnimateCardEntry, 260)}
                        >
                          <ReviewImage
                            alt={card.trip.name}
                            image={card.featuredImage}
                            imageClassName="h-60 sm:h-72"
                          />
                        </div>
                      )}

                      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] xl:items-start">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                          <MetricTile
                            label={t("story.tripSummaryVisits")}
                            value={card.trip.visitCount}
                          />
                          <MetricTile
                            label={t("story.tripSummaryImages")}
                            value={card.trip.imageCount}
                          />
                        </div>

                        {tripVisits.length > 0 && (
                          <ReviewVisitList
                            compact
                            denseColumns
                            title={t("story.tripSummaryVisitListTitle")}
                            visits={tripVisits}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </StoryCard>
            );
          }

          return (
            <StoryCard
              key={cardKeys[index]}
              active={index === activeIndex}
              entryState={entryState}
              kind={card.kind}
            >
              <section
                ref={(element) => {
                  sectionRefs.current[index] = element;
                }}
                data-card-index={index}
                data-story-entry-state={entryState}
                data-testid={`date-range-review-story-card-${index}`}
              >
                <div
                  className={getRevealClassName(shouldAnimateCardEntry)}
                  style={getRevealStyle(shouldAnimateCardEntry, 0)}
                >
                  <ReviewStorySectionHeader
                    badge={t("story.otherVisitsTitle")}
                    icon={<Footprints className="h-5 w-5" aria-hidden="true" />}
                    title={
                      <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
                        {t("story.otherVisitsHeading")}
                      </h3>
                    }
                    caption={t("story.otherVisitsCaption")}
                  />
                </div>

                <div
                  className={cn("mt-6", getRevealClassName(shouldAnimateCardEntry))}
                  style={getRevealStyle(shouldAnimateCardEntry, 180)}
                >
                  <ReviewVisitList title={t("story.otherVisitsListTitle")} visits={card.visits} />
                </div>
              </section>
            </StoryCard>
          );
        })}
      </div>

      <ReviewStoryFooter
        browseAppLabel={t("story.browseApp")}
        footer={t("story.footer")}
        footerHint={t("story.footerHint")}
        footerIcon={
          <Route
            className="mr-2 inline h-4 w-4 align-text-bottom text-primary"
            aria-hidden="true"
          />
        }
        mode={mode}
        siteTitle={layoutT("siteTitle")}
      />
    </div>
  );
};
