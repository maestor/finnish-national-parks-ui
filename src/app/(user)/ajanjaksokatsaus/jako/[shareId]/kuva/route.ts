import {
  type DateRangeReviewStory,
  isDateRangeReviewShareId,
  readDateRangeReviewShareOrNull,
} from "@/lib/date-range-review";
import { createSocialPreviewImageResponse } from "@/lib/social-preview-image";
import messages from "../../../../../../../messages/fi.json";

export const dynamic = "force-dynamic";

const createNotFoundResponse = () => new Response(null, { status: 404 });

const withName = (template: string, name: string) => template.replace("{name}", name);

const getDateRangeReviewShareImageUrl = (story: DateRangeReviewStory) => {
  for (const card of story.cards) {
    if (
      (card.kind === "photo-highlight" || card.kind === "trip-summary") &&
      card.featuredImage !== null
    ) {
      return card.featuredImage.fullUrl;
    }

    if (card.kind === "new-parks" || card.kind === "revisited-parks") {
      const parkWithImage = card.parks.find((park) => park.featuredImage !== null);

      if (parkWithImage?.featuredImage !== null && parkWithImage?.featuredImage !== undefined) {
        return parkWithImage.featuredImage.fullUrl;
      }
    }
  }

  return null;
};

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> },
) => {
  const { shareId } = await params;

  if (!isDateRangeReviewShareId(shareId)) {
    return createNotFoundResponse();
  }

  const share = await readDateRangeReviewShareOrNull(shareId);

  if (share === null) {
    return createNotFoundResponse();
  }

  return createSocialPreviewImageResponse({
    title: withName(messages.dateRangeReview.shareTitle, share.overview.name),
    description: withName(messages.dateRangeReview.shareDescription, share.overview.name),
    highlights: [
      `${share.story.summary.visitCount} ${messages.dateRangeReview.stats.visits.toLowerCase()}`,
      `${share.story.summary.tripCount} ${messages.dateRangeReview.stats.trips.toLowerCase()}`,
      `${share.story.summary.imageCount} ${messages.dateRangeReview.stats.images.toLowerCase()}`,
      `${share.story.summary.newNationalParkCount} ${messages.dateRangeReview.stats.newNationalParks.toLowerCase()}`,
    ],
    imageUrl: getDateRangeReviewShareImageUrl(share.story),
    variant: "landscape",
    width: 1200,
    height: 630,
  });
};
