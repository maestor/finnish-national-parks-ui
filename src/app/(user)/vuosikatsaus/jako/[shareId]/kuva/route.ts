import { createSocialPreviewImageResponse } from "@/lib/social-preview-image";
import {
  findYearReviewPhotoHighlightCard,
  findYearReviewProfileCard,
  findYearReviewTripHighlightCard,
  isYearReviewShareId,
  readYearReviewShareOrNull,
} from "@/lib/year-review";
import messages from "../../../../../../../messages/fi.json";

export const dynamic = "force-dynamic";

const createNotFoundResponse = () => new Response(null, { status: 404 });

const withYear = (template: string, year: number) => template.replace("{year}", String(year));

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> },
) => {
  const { shareId } = await params;

  if (!isYearReviewShareId(shareId)) {
    return createNotFoundResponse();
  }

  const share = await readYearReviewShareOrNull(shareId);

  if (share === null) {
    return createNotFoundResponse();
  }

  const profileCard = findYearReviewProfileCard(share.story);
  const photoHighlightCard = findYearReviewPhotoHighlightCard(share.story);
  const tripHighlightCard = findYearReviewTripHighlightCard(share.story);

  return createSocialPreviewImageResponse({
    title: withYear(messages.yearReview.shareTitle, share.year),
    description: withYear(messages.yearReview.shareDescription, share.year),
    highlights: [
      `${share.story.summary.visitCount} ${messages.yearReview.stats.visits.toLowerCase()}`,
      `${share.story.summary.newParkCount} ${messages.yearReview.stats.newParks.toLowerCase()}`,
      `${share.story.summary.imageCount} ${messages.yearReview.stats.images.toLowerCase()}`,
      ...(profileCard?.mostVisitedPark
        ? [`${profileCard.mostVisitedPark.name} x${profileCard.mostVisitedPark.visitCount}`]
        : []),
    ],
    imageUrl:
      photoHighlightCard?.featuredImage?.fullUrl ??
      tripHighlightCard?.featuredImage?.fullUrl ??
      null,
    variant: "landscape",
    width: 1200,
    height: 630,
  });
};
