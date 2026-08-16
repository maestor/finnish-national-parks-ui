import { ApiError, apiAuthFetch, apiFetch } from "./api";
import type { paths } from "./api-types";

type YearReviewPreviewResponse =
  paths["/api/year-review/{year}/preview"]["get"]["responses"][200]["content"]["application/json"];

type YearReviewShareResponse =
  paths["/api/year-review/shares/{shareId}"]["get"]["responses"][200]["content"]["application/json"];

export type YearReviewStory = YearReviewPreviewResponse["story"];
export type YearReviewCard = YearReviewStory["cards"][number];
export type YearReviewSummary = YearReviewStory["summary"];
export type YearReviewVisitsBySeason = YearReviewSummary["visitsBySeason"];
export type YearReviewIntroCard = Extract<YearReviewCard, { kind: "intro" }>;
export type YearReviewMilestoneCard = Extract<YearReviewCard, { kind: "milestone" }>;
export type YearReviewPhotoHighlightCard = Extract<YearReviewCard, { kind: "photo-highlight" }>;
export type YearReviewProfileCard = Extract<YearReviewCard, { kind: "profile" }>;
export type YearReviewTripHighlightCard = Extract<YearReviewCard, { kind: "trip-highlight" }>;
export type YearReviewNewParksCard = Extract<YearReviewCard, { kind: "new-parks" }>;
export type YearReviewSeasonalCard = Extract<YearReviewCard, { kind: "seasonal" }>;
export type YearReviewSummaryCard = Extract<YearReviewCard, { kind: "summary" }>;
export type YearReviewTripReference = NonNullable<YearReviewMilestoneCard["visit"]["trip"]>;
export type YearReviewStoryImage = NonNullable<YearReviewMilestoneCard["featuredImage"]>;
export type YearReviewVisitReference = YearReviewMilestoneCard["visit"];
export type YearReviewMostVisitedPark = NonNullable<YearReviewProfileCard["mostVisitedPark"]>;
export type YearReviewSeason = Exclude<YearReviewSeasonalCard["strongestSeason"], null>;
export type YearReviewPublishInfo = YearReviewPreviewResponse["publishInfo"];
export type YearReviewPreview = YearReviewPreviewResponse;
export type YearReviewPublishResponse =
  paths["/api/year-review/{year}/publish"]["post"]["responses"][200]["content"]["application/json"];
export type YearReviewShare = YearReviewShareResponse;

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

export const findYearReviewTripHighlightCard = (
  story: YearReviewStory,
): YearReviewTripHighlightCard | null =>
  story.cards.find((card): card is YearReviewTripHighlightCard => card.kind === "trip-highlight") ??
  null;

export const findYearReviewSocialPreviewImageUrl = (story: YearReviewStory): string | null =>
  findYearReviewPhotoHighlightCard(story)?.featuredImage?.fullUrl ??
  findYearReviewTripHighlightCard(story)?.featuredImage?.fullUrl ??
  null;

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
