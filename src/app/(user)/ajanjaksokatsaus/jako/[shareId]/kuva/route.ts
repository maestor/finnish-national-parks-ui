import {
  findDateRangeReviewSocialPreviewImageUrl,
  isDateRangeReviewShareId,
  readDateRangeReviewShareOrNull,
} from "@/lib/date-range-review";
import { createSocialPreviewImageResponse } from "@/lib/social-preview-image";
import messages from "../../../../../../../messages/fi.json";

export const dynamic = "force-dynamic";

const createNotFoundResponse = () => new Response(null, { status: 404 });

const withName = (template: string, name: string) => template.replace("{name}", name);

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

  const imageUrl = findDateRangeReviewSocialPreviewImageUrl(share.story);

  if (imageUrl) {
    return Response.redirect(imageUrl, 307);
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
    imageUrl: null,
    variant: "landscape",
    width: 1200,
    height: 630,
  });
};
