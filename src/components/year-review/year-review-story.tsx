"use client";

import {
  CalendarDays,
  Camera,
  Compass,
  MapPinned,
  Route,
  Sparkles,
  Trees,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  PUBLIC_HERO_DESCRIPTION_CLASS_NAME,
  PUBLIC_PANEL_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { appRoutes } from "@/lib/routes";
import type {
  YearReviewCard,
  YearReviewMostVisitedPark,
  YearReviewProfileCard,
  YearReviewSeason,
  YearReviewStory as YearReviewStoryData,
} from "@/lib/year-review";

interface YearReviewStoryProps {
  headingLevel?: 1 | 2;
  mode: "preview" | "public";
  publishedAt?: string | null;
  story: YearReviewStoryData;
}

type RenderableYearReviewCard = YearReviewCard | { kind: "empty"; year: number };

const DATE_FORMATTER = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Helsinki",
  year: "numeric",
});

const MONTH_FORMATTER = new Intl.DateTimeFormat("fi-FI", {
  month: "long",
  timeZone: "Europe/Helsinki",
});

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("fi-FI", {
  timeZone: "Europe/Helsinki",
  weekday: "long",
});

const resolveScrollBehavior = () => {
  if (typeof window === "undefined") {
    return "smooth" as const;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
};

const formatVisitDate = (value: string) => DATE_FORMATTER.format(new Date(`${value}T12:00:00Z`));

const formatTripDateRange = (start: string, end: string) =>
  start === end ? formatVisitDate(start) : `${formatVisitDate(start)} - ${formatVisitDate(end)}`;

const formatMonth = (month: number) =>
  MONTH_FORMATTER.format(new Date(Date.UTC(2024, month - 1, 1, 12)));

const formatWeekday = (weekday: number) =>
  WEEKDAY_FORMATTER.format(new Date(Date.UTC(2024, 0, 7 + weekday, 12)));

const getSeasonLabelKey = (season: YearReviewSeason) => `seasons.${season}` as const;

const SEASON_CARD_META: Record<
  YearReviewSeason,
  {
    barClassName: string;
    emoji: string;
  }
> = {
  spring: {
    barClassName: "bg-emerald-300",
    emoji: "🌱",
  },
  summer: {
    barClassName: "bg-amber-300",
    emoji: "☀️",
  },
  autumn: {
    barClassName: "bg-amber-600",
    emoji: "🍂",
  },
  winter: {
    barClassName: "bg-sky-300",
    emoji: "❄️",
  },
};

const findProfileCard = (story: YearReviewStoryData): YearReviewProfileCard | null =>
  story.cards.find((card): card is YearReviewProfileCard => card.kind === "profile") ?? null;

const REPEAT_SPOTLIGHT_MIN_VISITS = 3;

const getSummaryHighlights = (story: YearReviewStoryData) => [
  {
    labelKey: "stats.visits",
    value: story.summary.visitCount,
  },
  {
    labelKey: "stats.parks",
    value: story.summary.distinctParkCount,
  },
  {
    labelKey: "stats.newParks",
    value: story.summary.newParkCount,
  },
  {
    labelKey: "stats.images",
    value: story.summary.imageCount,
  },
  {
    labelKey: "stats.activeMonths",
    value: story.summary.activeMonthCount,
  },
];

const getRepeatSpotlight = (
  mostVisitedPark: YearReviewMostVisitedPark | null,
): YearReviewMostVisitedPark | null => {
  if (mostVisitedPark === null || mostVisitedPark.visitCount < REPEAT_SPOTLIGHT_MIN_VISITS) {
    return null;
  }

  return mostVisitedPark;
};

const getPhotoHighlightImageAlt = (
  card: Extract<YearReviewCard, { kind: "photo-highlight" }>,
  photoTitle: string,
) => {
  if (card.featuredImage?.alt) {
    return card.featuredImage.alt;
  }

  if (card.visit) {
    return `${card.visit.park.name}, ${formatVisitDate(card.visit.visitedOn)}`;
  }

  return photoTitle;
};

const getCardKey = (card: RenderableYearReviewCard) => {
  switch (card.kind) {
    case "empty":
      return `empty-${card.year}`;
    case "intro":
      return `intro-${card.year}`;
    case "milestone":
      return `milestone-${card.milestone}-${card.visit.id}`;
    case "photo-highlight":
      return `photo-${card.visit?.id ?? "none"}-${card.totalImageCount}`;
    case "profile":
      return "profile";
    case "trip-highlight":
      return `trip-${card.trip.id}`;
    case "seasonal":
      return "seasonal";
    case "summary":
      return "summary";
  }
};

const CARD_CONTAINER_CLASS_NAME =
  "group relative isolate overflow-hidden rounded-3xl border border-white/55 px-6 py-6 text-foreground shadow-[0_28px_72px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-all duration-500 dark:border-white/10 dark:shadow-[0_32px_80px_rgba(2,6,23,0.34)] sm:px-8 sm:py-8";

const CARD_INNER_GRID_CLASS_NAME =
  "relative z-10 flex min-h-112 flex-col justify-between gap-8 sm:min-h-128";

const CARD_COPY_CLASS_NAME = "max-w-3xl text-sm leading-6 text-primary-foreground/84 sm:text-base";

const METRIC_TILE_CLASS_NAME =
  "rounded-2xl border border-white/26 bg-black/16 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-sm";

const MICRO_BADGE_CLASS_NAME =
  "inline-flex items-center gap-2 rounded-full border border-white/26 bg-black/16 px-3 py-1 text-xs font-medium tracking-[0.16em] text-primary-foreground/78 uppercase backdrop-blur-sm";

const STORY_EYEBROW_BADGE_CLASS_NAME =
  "inline-flex items-center gap-2 rounded-full border border-white/28 bg-black/16 px-3 py-1 text-sm font-medium text-primary-foreground/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-sm";

const STORY_ICON_SURFACE_CLASS_NAME =
  "inline-flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-white/24 bg-black/18 text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-sm";

const CARD_THEME_CLASS_NAMES: Record<RenderableYearReviewCard["kind"], string> = {
  empty:
    "bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(12,74,110,0.92),rgba(21,128,61,0.86))] text-primary-foreground",
  intro:
    "bg-[linear-gradient(145deg,rgba(20,83,45,0.98),rgba(12,74,110,0.92),rgba(15,23,42,0.94))] text-primary-foreground",
  milestone:
    "bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(30,64,175,0.84),rgba(14,116,144,0.8))] text-primary-foreground",
  "photo-highlight":
    "bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(14,116,144,0.86),rgba(22,101,52,0.84))] text-primary-foreground",
  profile:
    "bg-[linear-gradient(145deg,rgba(30,41,59,0.98),rgba(12,74,110,0.88),rgba(21,128,61,0.84))] text-primary-foreground",
  "trip-highlight":
    "bg-[linear-gradient(145deg,rgba(68,64,60,0.98),rgba(22,101,52,0.84),rgba(14,116,144,0.82))] text-primary-foreground",
  seasonal:
    "bg-[linear-gradient(145deg,rgba(30,41,59,0.98),rgba(14,116,144,0.82),rgba(22,101,52,0.8))] text-primary-foreground",
  summary:
    "bg-[linear-gradient(145deg,rgba(20,83,45,0.98),rgba(12,74,110,0.86),rgba(15,23,42,0.94))] text-primary-foreground",
};

const YearReviewStory = ({
  headingLevel = 2,
  mode,
  publishedAt = null,
  story,
}: YearReviewStoryProps) => {
  const t = useTranslations("yearReview");
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const profileCard = findProfileCard(story);
  const repeatSpotlight = getRepeatSpotlight(profileCard?.mostVisitedPark ?? null);
  const cards: RenderableYearReviewCard[] =
    story.summary.visitCount === 0 ? [{ kind: "empty", year: story.year }] : story.cards;
  const HeadingTag = headingLevel === 1 ? "h1" : "h2";

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const nextEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (!nextEntry) {
          return;
        }

        const nextIndex = Number.parseInt(
          nextEntry.target.getAttribute("data-card-index") ?? "",
          10,
        );

        if (Number.isInteger(nextIndex)) {
          setActiveIndex(nextIndex);
        }
      },
      {
        rootMargin: "-12% 0px -18% 0px",
        threshold: [0.45, 0.65, 0.85],
      },
    );

    for (const section of sectionRefs.current) {
      if (section) {
        observer.observe(section);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    sectionRefs.current = sectionRefs.current.slice(0, cards.length);
    setActiveIndex(0);
  }, [cards.length]);

  const scrollToCard = (index: number) => {
    const nextSection = sectionRefs.current[index];

    nextSection?.scrollIntoView({
      behavior: resolveScrollBehavior(),
      block: "start",
    });
  };

  return (
    <div data-testid="year-review-story" className="space-y-5">
      <div className={cn(PUBLIC_PANEL_CLASS_NAME, "sticky top-3 z-20 px-4 py-4 sm:px-5")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              {mode === "preview" ? t("story.previewBadge") : t("story.shareBadge")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("story.progress", { current: activeIndex + 1, total: cards.length })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => scrollToCard(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
            >
              {t("story.previous")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => scrollToCard(Math.min(cards.length - 1, activeIndex + 1))}
              disabled={activeIndex === cards.length - 1}
            >
              {t("story.next")}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex gap-2" aria-hidden="true">
          {cards.map((card, index) => (
            <span
              key={getCardKey(card)}
              className={cn(
                "h-1.5 flex-1 rounded-full bg-muted transition-all duration-300",
                index === activeIndex && "bg-primary",
              )}
            />
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {cards.map((card, index) => {
          const isActive = index === activeIndex;

          return (
            <section
              key={getCardKey(card)}
              ref={(element) => {
                sectionRefs.current[index] = element;
              }}
              data-card-index={index}
              data-testid={`year-review-story-card-${index}`}
              aria-label={t("story.progress", { current: index + 1, total: cards.length })}
              className={cn(
                CARD_CONTAINER_CLASS_NAME,
                CARD_THEME_CLASS_NAMES[card.kind],
                isActive
                  ? "opacity-100 motion-safe:translate-y-0"
                  : "opacity-88 motion-safe:translate-y-2",
              )}
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-12 right-0 h-44 w-44 rounded-full bg-white/12 blur-3xl motion-safe:animate-year-review-float" />
                <div className="absolute bottom-0 left-0 h-52 w-52 rounded-full bg-emerald-300/18 blur-3xl motion-safe:animate-year-review-glow" />
                <div className="absolute inset-x-0 top-0 h-px bg-white/45" />
              </div>

              <div className={CARD_INNER_GRID_CLASS_NAME}>
                {card.kind === "empty" && (
                  <>
                    <div className="space-y-4">
                      <div className={STORY_EYEBROW_BADGE_CLASS_NAME}>
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        <span>{t("eyebrow")}</span>
                      </div>
                      <HeadingTag className="max-w-3xl text-4xl font-black tracking-tight text-primary-foreground sm:text-6xl">
                        {card.year}
                      </HeadingTag>
                      <div className="max-w-2xl space-y-3">
                        <h3 className="text-2xl font-semibold tracking-tight text-primary-foreground sm:text-3xl">
                          {t("story.emptyTitle")}
                        </h3>
                        <p className="text-sm leading-6 text-primary-foreground/82 sm:text-base">
                          {t("story.emptyDescription")}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {getSummaryHighlights(story)
                        .slice(0, 3)
                        .map((item) => (
                          <div key={item.labelKey} className={METRIC_TILE_CLASS_NAME}>
                            <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                              {t(item.labelKey)}
                            </p>
                            <p className="mt-2 text-3xl font-black tracking-tight text-primary-foreground">
                              {item.value}
                            </p>
                          </div>
                        ))}
                    </div>
                  </>
                )}

                {card.kind === "intro" && (
                  <>
                    <div className="space-y-4">
                      <div className={STORY_EYEBROW_BADGE_CLASS_NAME}>
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        <span>{t("eyebrow")}</span>
                      </div>
                      <HeadingTag className="max-w-3xl text-4xl font-black tracking-tight text-primary-foreground sm:text-6xl">
                        {t("story.introTitle", { year: card.year })}
                      </HeadingTag>
                      <p className="max-w-2xl text-sm leading-6 text-primary-foreground/82 sm:text-base">
                        {t("story.introCaption")}
                      </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)] lg:items-end">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-foreground/70">
                          {t("story.primaryStatLabel")}
                        </p>
                        <div className="mt-3 flex items-end gap-3">
                          <p className="text-7xl font-black tracking-[-0.04em] text-primary-foreground sm:text-8xl">
                            {card.primaryStat.value}
                          </p>
                          <p className="pb-2 text-sm font-semibold uppercase tracking-[0.22em] text-primary-foreground/72 sm:text-base">
                            {t("story.visitCountLabel")}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        {getSummaryHighlights(story)
                          .slice(0, 3)
                          .map((item) => (
                            <div key={item.labelKey} className={METRIC_TILE_CLASS_NAME}>
                              <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                                {t(item.labelKey)}
                              </p>
                              <p className="mt-2 text-3xl font-black tracking-tight text-primary-foreground">
                                {item.value}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}

                {card.kind === "milestone" && (
                  <>
                    <div className="space-y-4">
                      <div className={STORY_ICON_SURFACE_CLASS_NAME}>
                        <CalendarDays className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="space-y-3">
                        <p className={MICRO_BADGE_CLASS_NAME}>
                          {card.milestone === "first-visit"
                            ? t("story.firstVisitTitle")
                            : t("story.lastVisitTitle")}
                        </p>
                        <h3 className="max-w-3xl text-3xl font-black tracking-tight text-primary-foreground sm:text-5xl">
                          {card.visit.park.name}
                        </h3>
                        <p className={CARD_COPY_CLASS_NAME}>
                          {formatVisitDate(card.visit.visitedOn)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {card.visit.route !== null && (
                          <div className={METRIC_TILE_CLASS_NAME}>
                            <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                              {t("story.routeLabel")}
                            </p>
                            <p className="mt-2 text-xl font-semibold text-primary-foreground">
                              {card.visit.route}
                            </p>
                          </div>
                        )}
                        {card.visit.trip !== null && (
                          <div className={METRIC_TILE_CLASS_NAME}>
                            <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                              {t("story.tripLabel")}
                            </p>
                            <Link
                              href={appRoutes.trip(card.visit.trip.slug)}
                              className="mt-2 inline-flex text-xl font-semibold text-primary-foreground underline decoration-white/32 underline-offset-4 transition-colors hover:text-white"
                            >
                              {card.visit.trip.name}
                            </Link>
                          </div>
                        )}
                      </div>

                      <div className={METRIC_TILE_CLASS_NAME}>
                        <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                          {t("stats.images")}
                        </p>
                        <p className="mt-2 text-4xl font-black tracking-tight text-primary-foreground">
                          {card.visit.imageCount}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {card.kind === "photo-highlight" && (
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div className="space-y-4">
                      <div className={STORY_ICON_SURFACE_CLASS_NAME}>
                        <Camera className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="space-y-3">
                        <p className={MICRO_BADGE_CLASS_NAME}>{t("story.photoTitle")}</p>
                        <h3 className="text-3xl font-black tracking-tight text-primary-foreground sm:text-5xl">
                          {card.totalImageCount}
                        </h3>
                        <p className={CARD_COPY_CLASS_NAME}>
                          {t("story.photoCaption", { count: card.totalImageCount })}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {card.featuredImage ? (
                        <div className="relative overflow-hidden rounded-3xl border border-white/24 bg-black/12 shadow-[0_24px_56px_rgba(15,23,42,0.24)]">
                          <AppImage
                            src={card.featuredImage.thumbUrl}
                            alt={getPhotoHighlightImageAlt(card, t("story.photoTitle"))}
                            width={card.featuredImage.thumbWidth ?? 1200}
                            height={card.featuredImage.thumbHeight ?? 900}
                            sizes="(min-width: 1024px) 32rem, 100vw"
                            unoptimized
                            className="h-80 w-full object-cover sm:h-96"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-slate-950/18 to-transparent" />
                          {card.visit !== null && (
                            <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 sm:p-6">
                              <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                                {t("story.photoVisitTitle")}
                              </p>
                              <p className="text-2xl font-semibold text-primary-foreground sm:text-3xl">
                                {card.visit.park.name}
                              </p>
                              <p className="text-sm text-primary-foreground/82">
                                {formatVisitDate(card.visit.visitedOn)}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {card.visit ? (
                        <>
                          {!card.featuredImage && (
                            <div className={METRIC_TILE_CLASS_NAME}>
                              <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                                {t("story.photoVisitTitle")}
                              </p>
                              <p className="mt-2 text-2xl font-semibold text-primary-foreground">
                                {card.visit.park.name}
                              </p>
                              <p className="mt-2 text-sm text-primary-foreground/78">
                                {formatVisitDate(card.visit.visitedOn)}
                              </p>
                            </div>
                          )}
                          <div
                            className={cn(
                              METRIC_TILE_CLASS_NAME,
                              card.featuredImage && "sm:col-span-2",
                            )}
                          >
                            <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                              {t("story.photoVisitCount")}
                            </p>
                            <p className="mt-2 text-4xl font-black tracking-tight text-primary-foreground">
                              {card.visit.imageCount}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className={METRIC_TILE_CLASS_NAME}>
                          <p className="text-sm text-primary-foreground/78">
                            {t("story.notAvailable")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {card.kind === "profile" && (
                  <>
                    <div className="space-y-4">
                      <div className={STORY_ICON_SURFACE_CLASS_NAME}>
                        <Compass className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="space-y-3">
                        <p className={MICRO_BADGE_CLASS_NAME}>{t("story.profileTitle")}</p>
                        <h3 className="text-3xl font-black tracking-tight text-primary-foreground sm:text-5xl">
                          {t("story.profileCaption")}
                        </h3>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className={METRIC_TILE_CLASS_NAME}>
                        <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                          {t("stats.newParks")}
                        </p>
                        <p className="mt-2 text-4xl font-black tracking-tight text-primary-foreground">
                          {story.summary.newParkCount}
                        </p>
                      </div>
                      <div className={METRIC_TILE_CLASS_NAME}>
                        <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                          {t("stats.parks")}
                        </p>
                        <p className="mt-2 text-4xl font-black tracking-tight text-primary-foreground">
                          {story.summary.distinctParkCount}
                        </p>
                      </div>
                      <div className={METRIC_TILE_CLASS_NAME}>
                        <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                          {repeatSpotlight ? t("story.returnedPlace") : t("story.topType")}
                        </p>
                        <p className="mt-2 text-xl font-semibold text-primary-foreground">
                          {repeatSpotlight?.name ?? card.topTypeLabel ?? t("story.notAvailable")}
                        </p>
                        {repeatSpotlight && (
                          <p className="mt-2 text-sm text-primary-foreground/78">
                            {repeatSpotlight.visitCount} {t("story.visitCountLabel")}
                          </p>
                        )}
                      </div>
                      <div className={METRIC_TILE_CLASS_NAME}>
                        <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                          {t("story.busiestRhythm")}
                        </p>
                        <div className="mt-2 space-y-2 text-sm text-primary-foreground/82">
                          <p>
                            <span className="font-semibold text-primary-foreground">
                              {t("story.busiestMonth")}
                            </span>
                            {`: ${
                              card.busiestMonth === null
                                ? t("story.notAvailable")
                                : formatMonth(card.busiestMonth)
                            }`}
                          </p>
                          <p>
                            <span className="font-semibold text-primary-foreground">
                              {t("story.busiestWeekday")}
                            </span>
                            {`: ${
                              card.busiestWeekday === null
                                ? t("story.notAvailable")
                                : formatWeekday(card.busiestWeekday)
                            }`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {card.kind === "trip-highlight" && (
                  <>
                    <div className="space-y-4">
                      <div className={STORY_ICON_SURFACE_CLASS_NAME}>
                        <MapPinned className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="space-y-3">
                        <p className={MICRO_BADGE_CLASS_NAME}>{t("story.tripHighlightTitle")}</p>
                        <h3 className="max-w-3xl text-3xl font-black tracking-tight text-primary-foreground sm:text-5xl">
                          {card.trip.name}
                        </h3>
                        <p className={CARD_COPY_CLASS_NAME}>{t("story.tripHighlightCaption")}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className={METRIC_TILE_CLASS_NAME}>
                          <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                            {t("stats.visits")}
                          </p>
                          <p className="mt-2 text-4xl font-black tracking-tight text-primary-foreground">
                            {card.trip.visitCount}
                          </p>
                        </div>
                        <div className={METRIC_TILE_CLASS_NAME}>
                          <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                            {t("stats.images")}
                          </p>
                          <p className="mt-2 text-4xl font-black tracking-tight text-primary-foreground">
                            {card.trip.imageCount}
                          </p>
                        </div>
                      </div>

                      <div className={METRIC_TILE_CLASS_NAME}>
                        <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                          {t("story.tripLabel")}
                        </p>
                        <Link
                          href={appRoutes.trip(card.trip.slug)}
                          className="mt-2 inline-flex text-2xl font-semibold text-primary-foreground underline decoration-white/32 underline-offset-4 transition-colors hover:text-white"
                        >
                          {card.trip.name}
                        </Link>
                        {card.trip.dateRange !== null && (
                          <p className="mt-2 text-sm text-primary-foreground/78">
                            {formatTripDateRange(
                              card.trip.dateRange.start,
                              card.trip.dateRange.end,
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {card.kind === "seasonal" && (
                  <>
                    <div className="space-y-4">
                      <div className={STORY_ICON_SURFACE_CLASS_NAME}>
                        <Trees className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="space-y-3">
                        <p className={MICRO_BADGE_CLASS_NAME}>{t("story.seasonalTitle")}</p>
                        <h3 className="text-3xl font-black tracking-tight text-primary-foreground sm:text-5xl">
                          {t("story.seasonalCaption")}
                        </h3>
                        <p className={CARD_COPY_CLASS_NAME}>
                          {card.strongestSeason
                            ? t("story.strongestSeasonValue", {
                                season: t(getSeasonLabelKey(card.strongestSeason)),
                              })
                            : t("story.notAvailable")}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {(["spring", "summer", "autumn", "winter"] as YearReviewSeason[]).map(
                        (season) => {
                          const value = card.visitsBySeason[season];
                          const seasonMeta = SEASON_CARD_META[season];
                          const widthPercent =
                            story.summary.visitCount > 0
                              ? Math.round((value / story.summary.visitCount) * 100)
                              : 0;

                          return (
                            <div key={season} className={METRIC_TILE_CLASS_NAME}>
                              <div className="flex items-center justify-between gap-4">
                                <p className="flex items-center gap-2 font-semibold text-primary-foreground">
                                  <span aria-hidden="true" className="text-base leading-none">
                                    {seasonMeta.emoji}
                                  </span>
                                  {t(getSeasonLabelKey(season))}
                                </p>
                                <p className="text-sm text-primary-foreground/78">
                                  {value} · {widthPercent} %
                                </p>
                              </div>
                              <div className="mt-3 h-3 rounded-full bg-white/12">
                                <div
                                  className={cn(
                                    "h-3 rounded-full transition-[width] duration-700",
                                    seasonMeta.barClassName,
                                  )}
                                  style={{ width: `${widthPercent}%` }}
                                />
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </>
                )}

                {card.kind === "summary" && (
                  <>
                    <div className="space-y-4">
                      <div className={STORY_ICON_SURFACE_CLASS_NAME}>
                        <Trophy className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="space-y-3">
                        <p className={MICRO_BADGE_CLASS_NAME}>{t("story.summaryTitle")}</p>
                        <h3 className="text-3xl font-black tracking-tight text-primary-foreground sm:text-5xl">
                          {story.year}
                        </h3>
                        <p className={CARD_COPY_CLASS_NAME}>{t("story.summaryCaption")}</p>
                        {mode === "public" && publishedAt !== null && (
                          <p className="text-sm text-primary-foreground/78">
                            {t("story.publishedOn", {
                              date: formatVisitDate(publishedAt.slice(0, 10)),
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      {getSummaryHighlights(story).map((item) => (
                        <div key={item.labelKey} className={METRIC_TILE_CLASS_NAME}>
                          <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                            {t(item.labelKey)}
                          </p>
                          <p className="mt-2 text-2xl font-black tracking-tight text-primary-foreground">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className={cn(PUBLIC_PANEL_CLASS_NAME, "px-5 py-5")}>
        <p className="text-sm text-muted-foreground">{t("story.footer")}</p>
        <p className={`mt-2 ${PUBLIC_HERO_DESCRIPTION_CLASS_NAME}`}>
          <Route
            className="mr-2 inline h-4 w-4 align-text-bottom text-primary"
            aria-hidden="true"
          />
          {t("story.footerHint")}
        </p>
      </div>
    </div>
  );
};

export { YearReviewStory };
