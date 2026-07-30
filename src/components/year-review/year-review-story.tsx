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
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { HeaderBrandMark } from "@/components/layout/header-brand-mark";
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
  YearReviewStoryImage,
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

const CARD_SCROLL_GAP_PX = 20;

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

const getIntroHighlights = (story: YearReviewStoryData) =>
  getSummaryHighlights(story)
    .filter((item) => item.labelKey !== "stats.visits")
    .slice(0, 3);

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
    case "new-parks":
      return `new-parks-${card.parks.map((parkMoment) => parkMoment.park.slug).join("-")}`;
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

const STORY_BLOCK_REVEAL_CLASS_NAME = "year-review-reveal motion-safe:animate-year-review-enter";

const STORY_MEDIA_REVEAL_CLASS_NAME =
  "year-review-media-reveal motion-safe:animate-year-review-media";

const STORY_BLOCK_PENDING_CLASS_NAME = "year-review-reveal";

const STORY_MEDIA_PENDING_CLASS_NAME = "year-review-media-reveal";

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
  "new-parks":
    "bg-[linear-gradient(145deg,rgba(20,83,45,0.98),rgba(64,94,16,0.86),rgba(12,74,110,0.8))] text-primary-foreground",
  seasonal:
    "bg-[linear-gradient(145deg,rgba(30,41,59,0.98),rgba(14,116,144,0.82),rgba(22,101,52,0.8))] text-primary-foreground",
  summary:
    "bg-[linear-gradient(145deg,rgba(20,83,45,0.98),rgba(12,74,110,0.86),rgba(15,23,42,0.94))] text-primary-foreground",
};

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

const getStoryImageDimensions = (image: YearReviewStoryImage) => ({
  height: image.fullHeight ?? image.thumbHeight ?? 900,
  width: image.fullWidth ?? image.thumbWidth ?? 1200,
});

const getStoryThumbDimensions = (image: YearReviewStoryImage) => ({
  height: image.thumbHeight ?? image.fullHeight ?? 900,
  width: image.thumbWidth ?? image.fullWidth ?? 1200,
});

const isPortraitStoryImage = (image: YearReviewStoryImage) => {
  const { height, width } = getStoryImageDimensions(image);
  return height > width;
};

interface StoryFeaturedImagePanelProps {
  active: boolean;
  alt: string;
  children?: ReactNode;
  delayMs: number;
  image: YearReviewStoryImage;
  landscapeImageClassName: string;
  portraitImageClassName?: string;
  resolution?: "full" | "thumb";
  sizes: string;
  shouldAnimateEntry: boolean;
  wrapperClassName?: string;
}

const StoryFeaturedImagePanel = ({
  active,
  alt,
  children,
  delayMs,
  image,
  landscapeImageClassName,
  portraitImageClassName,
  resolution = "full",
  sizes,
  shouldAnimateEntry,
  wrapperClassName,
}: StoryFeaturedImagePanelProps) => {
  const isPortrait = isPortraitStoryImage(image);
  const dimensions =
    resolution === "thumb" ? getStoryThumbDimensions(image) : getStoryImageDimensions(image);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/24 bg-black/12 shadow-[0_24px_56px_rgba(15,23,42,0.24)]",
        getMediaRevealClassName(shouldAnimateEntry),
        isPortrait && "mx-auto w-full max-w-96 bg-slate-950/34",
        wrapperClassName,
      )}
      style={getRevealStyle(shouldAnimateEntry, delayMs)}
    >
      <AppImage
        src={resolution === "thumb" ? image.thumbUrl : image.fullUrl}
        alt={alt}
        width={dimensions.width}
        height={dimensions.height}
        sizes={sizes}
        unoptimized
        className={cn(
          "w-full motion-safe:transition-transform motion-safe:duration-1000 motion-safe:ease-out",
          isPortrait
            ? (portraitImageClassName ?? "h-112 object-contain p-3")
            : landscapeImageClassName,
          !isPortrait && (active ? "motion-safe:scale-100" : "motion-safe:scale-105"),
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/84 via-slate-950/16 to-transparent" />
      {children}
    </div>
  );
};

const YearReviewStory = ({ headingLevel = 2, mode, story }: YearReviewStoryProps) => {
  const t = useTranslations("yearReview");
  const layoutT = useTranslations("layout");
  const cards: RenderableYearReviewCard[] =
    story.summary.visitCount === 0 ? [{ kind: "empty", year: story.year }] : story.cards;
  const cardKeys = cards.map((card) => getCardKey(card));
  const firstCardKey = cardKeys[0] ?? null;
  const [activeIndex, setActiveIndex] = useState(0);
  const [entryAnimationCardKey, setEntryAnimationCardKey] = useState<string | null>(firstCardKey);
  const progressButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const seenCardKeysRef = useRef<Set<string>>(new Set());
  const storyRef = useRef<HTMLDivElement | null>(null);
  const navigationRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const profileCard = findProfileCard(story);
  const repeatSpotlight = getRepeatSpotlight(profileCard?.mostVisitedPark ?? null);
  const HeadingTag = headingLevel === 1 ? "h1" : "h2";
  const currentActiveCardKey = cardKeys[activeIndex] ?? null;

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
    progressButtonRefs.current = progressButtonRefs.current.slice(0, cards.length);
    sectionRefs.current = sectionRefs.current.slice(0, cards.length);
    setActiveIndex(0);
    seenCardKeysRef.current = new Set();
    setEntryAnimationCardKey(firstCardKey);
  }, [cards.length, firstCardKey]);

  useEffect(() => {
    if (!currentActiveCardKey) {
      setEntryAnimationCardKey(null);
      return;
    }

    if (!seenCardKeysRef.current.has(currentActiveCardKey)) {
      seenCardKeysRef.current.add(currentActiveCardKey);
      setEntryAnimationCardKey(currentActiveCardKey);
      return;
    }

    setEntryAnimationCardKey((previousKey) =>
      previousKey === currentActiveCardKey ? previousKey : null,
    );
  }, [currentActiveCardKey]);

  const scrollToPosition = (top: number) => {
    window.scrollTo({
      behavior: "auto",
      top,
    });
  };

  const scrollToCard = (index: number) => {
    if (typeof window === "undefined") {
      return;
    }

    const nextSection = sectionRefs.current[index];
    const navigation = navigationRef.current;

    if (!(nextSection && navigation)) {
      return;
    }

    if (index === 0) {
      const storyTop = storyRef.current?.getBoundingClientRect().top ?? 0;

      scrollToPosition(Math.max(storyTop + window.scrollY, 0));
      return;
    }

    const navigationRect = navigation.getBoundingClientRect();
    const sectionTop = nextSection.getBoundingClientRect().top + window.scrollY;
    const maxScrollTop = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    const scrollTarget = Math.min(
      Math.max(sectionTop - (navigationRect.top + navigationRect.height + CARD_SCROLL_GAP_PX), 0),
      maxScrollTop,
    );

    scrollToPosition(scrollTarget);
  };

  const handleStepButtonNavigation = (targetIndex: number, button: HTMLButtonElement | null) => {
    button?.blur();

    const targetButton = progressButtonRefs.current[targetIndex];

    if (targetButton) {
      targetButton.focus({ preventScroll: true });
      targetButton.click();
      return;
    }

    scrollToCard(targetIndex);
  };

  return (
    <div
      ref={storyRef}
      data-testid="year-review-story"
      className={cn("space-y-5", mode === "public" && "pb-24 sm:pb-32")}
    >
      <div
        ref={navigationRef}
        className={cn(PUBLIC_PANEL_CLASS_NAME, "sticky z-20 px-4 py-4 sm:px-5")}
        style={{ top: "var(--page-sticky-nav-top, 0rem)" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              {mode === "preview" && (
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  {t("story.previewBadge")}
                </span>
              )}
              {t("story.progress", { current: activeIndex + 1, total: cards.length })}
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
            {cards.map((card, index) => (
              <button
                key={getCardKey(card)}
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
          const isActive = index === activeIndex;
          const cardKey = cardKeys[index];
          const shouldAnimateCardEntry = entryAnimationCardKey === cardKey;
          const hasCardBeenSeen = shouldAnimateCardEntry || seenCardKeysRef.current.has(cardKey);
          const milestoneHasPortraitFeaturedImage =
            card.kind === "milestone" &&
            card.featuredImage !== null &&
            isPortraitStoryImage(card.featuredImage);
          const tripHasPortraitFeaturedImage =
            card.kind === "trip-highlight" &&
            card.featuredImage !== null &&
            isPortraitStoryImage(card.featuredImage);

          return (
            <section
              key={getCardKey(card)}
              ref={(element) => {
                sectionRefs.current[index] = element;
              }}
              data-card-index={index}
              data-testid={`year-review-story-card-${index}`}
              data-story-entry-state={
                shouldAnimateCardEntry ? "entry" : hasCardBeenSeen ? "seen" : "upcoming"
              }
              aria-label={t("story.progress", { current: index + 1, total: cards.length })}
              className={cn(
                CARD_CONTAINER_CLASS_NAME,
                CARD_THEME_CLASS_NAMES[card.kind],
                "motion-safe:transition-[transform,opacity,box-shadow] motion-safe:duration-500 motion-safe:ease-out",
                isActive
                  ? "opacity-100 motion-safe:translate-y-0"
                  : "opacity-90 motion-safe:translate-y-2",
              )}
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                  className={cn(
                    "absolute -top-12 right-0 h-44 w-44 rounded-full bg-white/12 blur-3xl transition-opacity duration-500",
                    isActive ? "opacity-100 motion-safe:animate-year-review-float" : "opacity-55",
                  )}
                />
                <div
                  className={cn(
                    "absolute bottom-0 left-0 h-52 w-52 rounded-full bg-emerald-300/18 blur-3xl transition-opacity duration-500",
                    isActive ? "opacity-100 motion-safe:animate-year-review-glow" : "opacity-45",
                  )}
                />
                <div className="absolute inset-x-0 top-0 h-px bg-white/45" />
              </div>

              <div className={CARD_INNER_GRID_CLASS_NAME}>
                {card.kind === "empty" && (
                  <>
                    <div
                      className={cn("space-y-4", getRevealClassName(shouldAnimateCardEntry))}
                      style={getRevealStyle(shouldAnimateCardEntry, 0)}
                    >
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

                    <div
                      className={cn(
                        "grid gap-3 sm:grid-cols-3",
                        getRevealClassName(shouldAnimateCardEntry),
                      )}
                      style={getRevealStyle(shouldAnimateCardEntry, 160)}
                    >
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
                    <div
                      className={cn("space-y-4", getRevealClassName(shouldAnimateCardEntry))}
                      style={getRevealStyle(shouldAnimateCardEntry, 0)}
                    >
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

                    <div
                      className={cn(
                        "grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)] lg:items-end",
                        getRevealClassName(shouldAnimateCardEntry),
                      )}
                      style={getRevealStyle(shouldAnimateCardEntry, 160)}
                    >
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
                        {getIntroHighlights(story).map((item) => (
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
                    <div
                      className={cn("space-y-4", getRevealClassName(shouldAnimateCardEntry))}
                      style={getRevealStyle(shouldAnimateCardEntry, 0)}
                    >
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

                    <div
                      className={cn(
                        "grid gap-4",
                        getRevealClassName(shouldAnimateCardEntry),
                        milestoneHasPortraitFeaturedImage
                          ? "lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start"
                          : card.featuredImage
                            ? "lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
                            : "lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]",
                      )}
                      data-story-layout={
                        milestoneHasPortraitFeaturedImage ? "portrait-split" : undefined
                      }
                      style={getRevealStyle(shouldAnimateCardEntry, 180)}
                    >
                      {milestoneHasPortraitFeaturedImage && card.featuredImage ? (
                        <StoryFeaturedImagePanel
                          active={isActive}
                          alt={
                            card.featuredImage.alt ??
                            `${card.visit.park.name}, ${formatVisitDate(card.visit.visitedOn)}`
                          }
                          delayMs={300}
                          image={card.featuredImage}
                          landscapeImageClassName="h-72 object-cover sm:h-80"
                          portraitImageClassName="h-104 object-contain p-3"
                          sizes="(min-width: 1024px) 28rem, 100vw"
                          resolution="full"
                          shouldAnimateEntry={shouldAnimateCardEntry}
                          wrapperClassName="lg:max-w-none"
                        />
                      ) : null}

                      <div className="grid gap-3 sm:grid-cols-2 lg:content-start">
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

                        <div
                          className={cn(
                            METRIC_TILE_CLASS_NAME,
                            milestoneHasPortraitFeaturedImage &&
                              card.visit.route !== null &&
                              card.visit.trip !== null &&
                              "sm:col-span-2",
                          )}
                        >
                          <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/70">
                            {t("stats.images")}
                          </p>
                          <p className="mt-2 text-4xl font-black tracking-tight text-primary-foreground">
                            {card.visit.imageCount}
                          </p>
                        </div>
                      </div>

                      {card.featuredImage && !milestoneHasPortraitFeaturedImage ? (
                        <StoryFeaturedImagePanel
                          active={isActive}
                          alt={
                            card.featuredImage.alt ??
                            `${card.visit.park.name}, ${formatVisitDate(card.visit.visitedOn)}`
                          }
                          delayMs={300}
                          image={card.featuredImage}
                          landscapeImageClassName="h-72 object-cover sm:h-80"
                          sizes="(min-width: 1024px) 28rem, 100vw"
                          shouldAnimateEntry={shouldAnimateCardEntry}
                        />
                      ) : null}
                    </div>
                  </>
                )}

                {card.kind === "photo-highlight" && (
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div
                      className={cn("space-y-4", getRevealClassName(shouldAnimateCardEntry))}
                      style={getRevealStyle(shouldAnimateCardEntry, 0)}
                    >
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

                    <div
                      className={cn("grid gap-3", getRevealClassName(shouldAnimateCardEntry))}
                      style={getRevealStyle(shouldAnimateCardEntry, 180)}
                    >
                      {card.featuredImage ? (
                        <StoryFeaturedImagePanel
                          active={isActive}
                          alt={getPhotoHighlightImageAlt(card, t("story.photoTitle"))}
                          delayMs={260}
                          image={card.featuredImage}
                          landscapeImageClassName="h-80 object-cover sm:h-96"
                          portraitImageClassName="h-112 object-contain p-3 sm:h-120"
                          sizes="(min-width: 1024px) 32rem, 100vw"
                          shouldAnimateEntry={shouldAnimateCardEntry}
                        >
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
                        </StoryFeaturedImagePanel>
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
                    <div
                      className={cn("space-y-4", getRevealClassName(shouldAnimateCardEntry))}
                      style={getRevealStyle(shouldAnimateCardEntry, 0)}
                    >
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

                    <div
                      className={cn(
                        "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
                        getRevealClassName(shouldAnimateCardEntry),
                      )}
                      style={getRevealStyle(shouldAnimateCardEntry, 180)}
                    >
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
                    <div
                      className={cn("space-y-4", getRevealClassName(shouldAnimateCardEntry))}
                      style={getRevealStyle(shouldAnimateCardEntry, 0)}
                    >
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

                    <div
                      className={cn(
                        "grid gap-3",
                        getRevealClassName(shouldAnimateCardEntry),
                        tripHasPortraitFeaturedImage
                          ? "lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start"
                          : card.featuredImage
                            ? "lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
                            : "lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]",
                      )}
                      data-story-layout={
                        tripHasPortraitFeaturedImage ? "portrait-media-right" : undefined
                      }
                      style={getRevealStyle(shouldAnimateCardEntry, 180)}
                    >
                      <div className="grid gap-3 sm:grid-cols-2 lg:content-start">
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

                        <div
                          className={cn(
                            METRIC_TILE_CLASS_NAME,
                            tripHasPortraitFeaturedImage && "sm:col-span-2",
                          )}
                        >
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

                      {tripHasPortraitFeaturedImage && card.featuredImage ? (
                        <StoryFeaturedImagePanel
                          active={isActive}
                          alt={card.featuredImage.alt ?? card.trip.name}
                          delayMs={300}
                          image={card.featuredImage}
                          landscapeImageClassName="h-80 object-cover"
                          portraitImageClassName="h-104 object-contain p-3"
                          sizes="(min-width: 1024px) 28rem, 100vw"
                          shouldAnimateEntry={shouldAnimateCardEntry}
                          wrapperClassName="lg:max-w-none"
                        />
                      ) : null}

                      {card.featuredImage && !tripHasPortraitFeaturedImage ? (
                        <StoryFeaturedImagePanel
                          active={isActive}
                          alt={card.featuredImage.alt ?? card.trip.name}
                          delayMs={300}
                          image={card.featuredImage}
                          landscapeImageClassName="h-80 object-cover"
                          portraitImageClassName="h-112 object-contain p-3"
                          sizes="(min-width: 1024px) 28rem, 100vw"
                          shouldAnimateEntry={shouldAnimateCardEntry}
                        />
                      ) : null}
                    </div>
                  </>
                )}

                {card.kind === "new-parks" && (
                  <>
                    <div
                      className={cn("space-y-4", getRevealClassName(shouldAnimateCardEntry))}
                      style={getRevealStyle(shouldAnimateCardEntry, 0)}
                    >
                      <div className={STORY_ICON_SURFACE_CLASS_NAME}>
                        <Trees className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="space-y-3">
                        <p className={MICRO_BADGE_CLASS_NAME}>{t("story.newParksTitle")}</p>
                        <h3 className="text-3xl font-black tracking-tight text-primary-foreground sm:text-5xl">
                          {t("story.newParksHeading", { count: card.parks.length })}
                        </h3>
                        <p className={CARD_COPY_CLASS_NAME}>{t("story.newParksCaption")}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {card.parks.map((parkMoment, parkIndex) => (
                        <article
                          key={parkMoment.park.slug}
                          className={cn(
                            "overflow-hidden rounded-3xl border border-white/24 bg-black/14 shadow-[0_24px_56px_rgba(15,23,42,0.2)]",
                            getMediaRevealClassName(shouldAnimateCardEntry),
                          )}
                          style={getRevealStyle(shouldAnimateCardEntry, 180 + parkIndex * 90)}
                        >
                          {parkMoment.featuredImage ? (
                            <StoryFeaturedImagePanel
                              active={isActive}
                              alt={
                                parkMoment.featuredImage.alt ??
                                `${parkMoment.park.name}, ${formatVisitDate(parkMoment.visitedOn)}`
                              }
                              delayMs={180 + parkIndex * 90}
                              image={parkMoment.featuredImage}
                              landscapeImageClassName="h-56 object-cover"
                              portraitImageClassName="h-72 object-contain p-3"
                              resolution="thumb"
                              sizes="(min-width: 1280px) 20rem, (min-width: 768px) 24rem, 100vw"
                              shouldAnimateEntry={shouldAnimateCardEntry}
                              wrapperClassName="rounded-none border-0 bg-transparent shadow-none"
                            />
                          ) : null}

                          <div className="space-y-3 p-5">
                            <Link
                              href={appRoutes.park(parkMoment.park.slug)}
                              className="inline-flex text-xl font-semibold text-primary-foreground underline decoration-white/32 underline-offset-4 transition-colors hover:text-white"
                            >
                              {parkMoment.park.name}
                            </Link>
                            <p className="text-sm text-primary-foreground/82">
                              {t("story.newParkVisitedOn", {
                                date: formatVisitDate(parkMoment.visitedOn),
                              })}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                )}

                {card.kind === "seasonal" && (
                  <>
                    <div
                      className={cn("space-y-4", getRevealClassName(shouldAnimateCardEntry))}
                      style={getRevealStyle(shouldAnimateCardEntry, 0)}
                    >
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
                        (season, seasonIndex) => {
                          const value = card.visitsBySeason[season];
                          const seasonMeta = SEASON_CARD_META[season];
                          const widthPercent =
                            story.summary.visitCount > 0
                              ? Math.round((value / story.summary.visitCount) * 100)
                              : 0;

                          return (
                            <div
                              key={season}
                              className={cn(
                                METRIC_TILE_CLASS_NAME,
                                getRevealClassName(shouldAnimateCardEntry),
                              )}
                              style={getRevealStyle(shouldAnimateCardEntry, 150 + seasonIndex * 90)}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <p className="flex items-center gap-2 font-semibold text-primary-foreground">
                                  <span aria-hidden="true" className="text-base leading-none">
                                    {seasonMeta.emoji}
                                  </span>
                                  {t(getSeasonLabelKey(season))}
                                </p>
                                <p className="text-sm text-primary-foreground/78">
                                  {`${value} ${t("stats.visitCount")} (${widthPercent}%)`}
                                </p>
                              </div>
                              <div className="mt-3 h-3 rounded-full bg-white/12">
                                <div
                                  className={cn(
                                    "h-3 rounded-full transition-[width] duration-700",
                                    seasonMeta.barClassName,
                                  )}
                                  style={{
                                    transitionDelay: shouldAnimateCardEntry
                                      ? `${240 + seasonIndex * 90}ms`
                                      : undefined,
                                    width: `${hasCardBeenSeen ? widthPercent : 0}%`,
                                  }}
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
                    <div
                      className={cn("space-y-4", getRevealClassName(shouldAnimateCardEntry))}
                      style={getRevealStyle(shouldAnimateCardEntry, 0)}
                    >
                      <div className={STORY_ICON_SURFACE_CLASS_NAME}>
                        <Trophy className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="space-y-3">
                        <p className={MICRO_BADGE_CLASS_NAME}>{t("story.summaryTitle")}</p>
                        <h3 className="text-3xl font-black tracking-tight text-primary-foreground sm:text-5xl">
                          {story.year}
                        </h3>
                        <p className={CARD_COPY_CLASS_NAME}>{t("story.summaryCaption")}</p>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "grid gap-3 sm:grid-cols-2 xl:grid-cols-5",
                        getRevealClassName(shouldAnimateCardEntry),
                      )}
                      style={getRevealStyle(shouldAnimateCardEntry, 180)}
                    >
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
        {mode === "public" ? (
          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
            <Link
              href={appRoutes.home}
              className="inline-flex items-center gap-3 self-start rounded-full border border-white/45 bg-white/82 px-3 py-2 text-foreground shadow-[0_12px_28px_rgba(148,163,184,0.22)] backdrop-blur-md transition-colors hover:bg-white/94 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/56 dark:hover:bg-slate-950/76 dark:shadow-[0_16px_32px_rgba(2,6,23,0.38)] sm:justify-self-start"
            >
              <HeaderBrandMark className="h-10 w-10" />
              <span className="text-base font-semibold">{layoutT("siteTitle")}</span>
            </Link>
            <p className={cn(PUBLIC_HERO_DESCRIPTION_CLASS_NAME, "sm:text-center")}>
              <Route
                className="mr-2 inline h-4 w-4 align-text-bottom text-primary"
                aria-hidden="true"
              />
              {t("story.footer")}
            </p>
            <Link
              href={appRoutes.home}
              className="inline-flex items-center justify-center rounded-full border border-border/60 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:justify-self-end"
            >
              {t("story.browseApp")}
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t("story.footer")}</p>
            <p className={`mt-2 ${PUBLIC_HERO_DESCRIPTION_CLASS_NAME}`}>
              <Route
                className="mr-2 inline h-4 w-4 align-text-bottom text-primary"
                aria-hidden="true"
              />
              {t("story.footerHint")}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export { YearReviewStory };
