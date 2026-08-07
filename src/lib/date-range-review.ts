import { ApiError, apiAuthFetch, apiFetch } from "./api";
import type { paths } from "./api-types";

type DateRangeReviewPreviewResponse =
  paths["/api/date-range-review/preview"]["get"]["responses"][200]["content"]["application/json"];

type DateRangeReviewShareResponse =
  paths["/api/date-range-review/shares/{shareId}"]["get"]["responses"][200]["content"]["application/json"];

export type DateRangeReviewOverview = DateRangeReviewPreviewResponse["overview"];
export type DateRangeReviewStory = DateRangeReviewPreviewResponse["story"];
export type DateRangeReviewCard = DateRangeReviewStory["cards"][number];
export type DateRangeReviewSummary = DateRangeReviewStory["summary"];
export type DateRangeReviewIntroCard = Extract<DateRangeReviewCard, { kind: "intro" }>;
export type DateRangeReviewPhotoHighlightCard = Extract<
  DateRangeReviewCard,
  { kind: "photo-highlight" }
>;
export type DateRangeReviewNewParksCard = Extract<DateRangeReviewCard, { kind: "new-parks" }>;
export type DateRangeReviewRevisitedParksCard = Extract<
  DateRangeReviewCard,
  { kind: "revisited-parks" }
>;
export type DateRangeReviewTripSummaryCard = Extract<DateRangeReviewCard, { kind: "trip-summary" }>;
export type DateRangeReviewOtherVisitsCard = Extract<DateRangeReviewCard, { kind: "other-visits" }>;
export type DateRangeReviewStoryVisit = DateRangeReviewOtherVisitsCard["visits"][number];
export type DateRangeReviewPublishInfo = DateRangeReviewPreviewResponse["publishInfo"];
export type DateRangeReviewPreview = DateRangeReviewPreviewResponse;
export type DateRangeReviewPublishResponse =
  paths["/api/date-range-review/publish"]["post"]["responses"][200]["content"]["application/json"];
export type DateRangeReviewShare = DateRangeReviewShareResponse;

export interface DateRangeReviewPreviewRequest {
  endDate: string;
  name: string;
  startDate: string;
}

const normalizeDateRangeReviewStory = (story: DateRangeReviewStory): DateRangeReviewStory => ({
  ...story,
  cards: story.cards.map((card) => {
    if (card.kind === "trip-summary") {
      return {
        ...card,
        trip: {
          ...card.trip,
          visits: card.trip.visits ?? [],
        },
      };
    }

    if (card.kind === "other-visits") {
      return {
        ...card,
        visits: card.visits ?? [],
      };
    }

    return card;
  }),
});

const normalizeDateRangeReviewPreview = (
  preview: DateRangeReviewPreview,
): DateRangeReviewPreview => ({
  ...preview,
  story: normalizeDateRangeReviewStory(preview.story),
});

const normalizeDateRangeReviewShare = (share: DateRangeReviewShare): DateRangeReviewShare => ({
  ...share,
  story: normalizeDateRangeReviewStory(share.story),
});

const REVIEW_SHARE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createPreviewQuery = ({ endDate, name, startDate }: DateRangeReviewPreviewRequest) =>
  new URLSearchParams({
    endDate,
    name,
    startDate,
  }).toString();

export const isDateRangeReviewShareId = (value: string) => REVIEW_SHARE_ID_PATTERN.test(value);

export const fetchDateRangeReviewPreview = async (
  request: DateRangeReviewPreviewRequest,
): Promise<DateRangeReviewPreview> =>
  normalizeDateRangeReviewPreview(
    await apiAuthFetch<DateRangeReviewPreview>(
      `/api/date-range-review/preview?${createPreviewQuery(request)}`,
      {
        cache: "no-store",
      },
    ),
  );

export const fetchDateRangeReviewShare = async (shareId: string): Promise<DateRangeReviewShare> =>
  normalizeDateRangeReviewShare(
    await apiFetch<DateRangeReviewShare>(`/api/date-range-review/shares/${shareId}`, {
      cache: "no-store",
    }),
  );

export const readDateRangeReviewShareOrNull = async (
  shareId: string,
): Promise<DateRangeReviewShare | null> => {
  try {
    return await fetchDateRangeReviewShare(shareId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
};

export const buildDateRangeReviewShareDescription = ({
  imageCount,
  name,
  t,
  tripCount,
  visitCount,
}: {
  imageCount: number;
  name: string;
  t: (key: string, values?: Record<string, string | number>) => string;
  tripCount: number;
  visitCount: number;
}) =>
  t("shareDescription", {
    imageCount,
    name,
    tripCount,
    visitCount,
  });
