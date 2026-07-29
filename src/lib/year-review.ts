import { ApiError, apiAuthFetch, apiFetch } from "./api";

export type YearReviewSeason = "autumn" | "spring" | "summer" | "winter";

export interface YearReviewVisitsBySeason {
  autumn: number;
  spring: number;
  summer: number;
  winter: number;
}

export interface YearReviewTripReference {
  id: number;
  name: string;
  slug: string;
}

export interface YearReviewStoryImage {
  alt: string | null;
  fullHeight: number | null;
  fullUrl: string;
  fullWidth: number | null;
  thumbHeight: number | null;
  thumbUrl: string;
  thumbWidth: number | null;
}

export interface YearReviewVisitReference {
  id: number;
  imageCount: number;
  park: {
    name: string;
    slug: string;
  };
  route: string | null;
  trip: YearReviewTripReference | null;
  visitedOn: string;
}

export interface YearReviewMostVisitedPark {
  name: string;
  slug: string;
  visitCount: number;
}

export interface YearReviewSummary {
  activeMonthCount: number;
  distinctParkCount: number;
  imageCount: number;
  newParkCount: number;
  revisitedParkCount: number;
  visitCount: number;
  visitsBySeason: YearReviewVisitsBySeason;
}

export interface YearReviewIntroCard {
  kind: "intro";
  primaryStat: {
    key: "visitCount";
    value: number;
  };
  year: number;
}

export interface YearReviewMilestoneCard {
  featuredImage: YearReviewStoryImage | null;
  kind: "milestone";
  milestone: "first-visit" | "last-visit";
  visit: YearReviewVisitReference;
}

export interface YearReviewPhotoHighlightCard {
  featuredImage: YearReviewStoryImage | null;
  kind: "photo-highlight";
  totalImageCount: number;
  visit: YearReviewVisitReference | null;
}

export interface YearReviewProfileCard {
  busiestMonth: number | null;
  busiestWeekday: number | null;
  kind: "profile";
  mostVisitedPark: YearReviewMostVisitedPark | null;
  topRoute: string | null;
  topTypeLabel: string | null;
}

export interface YearReviewTripHighlightCard {
  featuredImage: YearReviewStoryImage | null;
  kind: "trip-highlight";
  trip: {
    dateRange: {
      end: string;
      start: string;
    } | null;
    id: number;
    imageCount: number;
    name: string;
    slug: string;
    visitCount: number;
  };
}

export interface YearReviewNewParksCard {
  kind: "new-parks";
  parks: Array<{
    featuredImage: YearReviewStoryImage | null;
    park: {
      name: string;
      slug: string;
    };
    visitedOn: string;
  }>;
}

export interface YearReviewSeasonalCard {
  kind: "seasonal";
  strongestSeason: YearReviewSeason | null;
  visitsBySeason: YearReviewVisitsBySeason;
}

export interface YearReviewSummaryCard {
  highlights: string[];
  kind: "summary";
}

export type YearReviewCard =
  | YearReviewIntroCard
  | YearReviewMilestoneCard
  | YearReviewPhotoHighlightCard
  | YearReviewProfileCard
  | YearReviewTripHighlightCard
  | YearReviewNewParksCard
  | YearReviewSeasonalCard
  | YearReviewSummaryCard;

export interface YearReviewStory {
  cards: YearReviewCard[];
  summary: YearReviewSummary;
  year: number;
}

export interface YearReviewPublishInfo {
  publicUrl: string | null;
  publishedAt: string | null;
  publishedShareId: string | null;
  sharePath: string | null;
}

export interface YearReviewPreview {
  generatedAt: string;
  publishInfo: YearReviewPublishInfo;
  status: "draft" | "published";
  story: YearReviewStory;
  year: number;
}

export interface YearReviewPublishResponse {
  publicUrl: string;
  publishedAt: string;
  shareId: string;
  sharePath: string;
}

export interface YearReviewShare {
  publishedAt: string;
  shareId: string;
  story: YearReviewStory;
  year: number;
}

const YEAR_REVIEW_SHARE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isYearReviewShareId = (value: string) => YEAR_REVIEW_SHARE_ID_PATTERN.test(value);

export const fetchYearReviewPreview = async (year: number): Promise<YearReviewPreview> =>
  apiAuthFetch<YearReviewPreview>(`/api/year-review/${year}/preview`, {
    cache: "no-store",
  });

export const fetchYearReviewShare = async (shareId: string): Promise<YearReviewShare> =>
  apiFetch<YearReviewShare>(`/api/year-review/shares/${shareId}`, {
    cache: "no-store",
  });

export const readYearReviewShareOrNull = async (
  shareId: string,
): Promise<YearReviewShare | null> => {
  try {
    return await fetchYearReviewShare(shareId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
};

export const findYearReviewProfileCard = (story: YearReviewStory): YearReviewProfileCard | null =>
  story.cards.find((card): card is YearReviewProfileCard => card.kind === "profile") ?? null;

export const findYearReviewPhotoHighlightCard = (
  story: YearReviewStory,
): YearReviewPhotoHighlightCard | null =>
  story.cards.find(
    (card): card is YearReviewPhotoHighlightCard => card.kind === "photo-highlight",
  ) ?? null;

export const findYearReviewSeasonalCard = (story: YearReviewStory): YearReviewSeasonalCard | null =>
  story.cards.find((card): card is YearReviewSeasonalCard => card.kind === "seasonal") ?? null;

export const buildYearReviewShareDescription = ({
  imageCount,
  newParkCount,
  t,
  visitCount,
  year,
}: {
  imageCount: number;
  newParkCount: number;
  t: (key: string, values?: Record<string, string | number>) => string;
  visitCount: number;
  year: number;
}) =>
  t("shareDescription", {
    year,
    visitCount,
    newParkCount,
    imageCount,
  });
