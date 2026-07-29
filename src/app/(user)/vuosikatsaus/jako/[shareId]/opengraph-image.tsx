import { notFound } from "next/navigation";
import { createSocialPreviewImageResponse } from "@/lib/social-preview-image";
import {
  findYearReviewPhotoHighlightCard,
  findYearReviewProfileCard,
  isYearReviewShareId,
  readYearReviewShareOrNull,
} from "@/lib/year-review";
import messages from "../../../../../../messages/fi.json";

export const alt = messages.yearReview.ogAlt;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// The share snapshot is loaded on demand from the backend, so keep this route
// dynamic even during local builds when no backend is reachable.
export const dynamic = "force-dynamic";

const withYear = (template: string, year: number) => template.replace("{year}", String(year));

const YearReviewOpenGraphImage = async ({ params }: { params: Promise<{ shareId: string }> }) => {
  const { shareId } = await params;

  if (!isYearReviewShareId(shareId)) {
    notFound();
  }

  const share = await readYearReviewShareOrNull(shareId);

  if (share === null) {
    notFound();
  }

  const profileCard = findYearReviewProfileCard(share.story);
  const photoHighlightCard = findYearReviewPhotoHighlightCard(share.story);
  const highlights = [
    `${share.story.summary.visitCount} ${messages.yearReview.stats.visits.toLowerCase()}`,
    `${share.story.summary.newParkCount} ${messages.yearReview.stats.newParks.toLowerCase()}`,
    `${share.story.summary.imageCount} ${messages.yearReview.stats.images.toLowerCase()}`,
    ...(profileCard?.mostVisitedPark
      ? [`${profileCard.mostVisitedPark.name} x${profileCard.mostVisitedPark.visitCount}`]
      : []),
  ];

  return createSocialPreviewImageResponse({
    title: withYear(messages.yearReview.shareTitle, share.year),
    description: withYear(messages.yearReview.shareDescription, share.year),
    highlights,
    imageUrl: photoHighlightCard?.featuredImage?.fullUrl ?? null,
    variant: "landscape",
    width: size.width,
    height: size.height,
  });
};

export default YearReviewOpenGraphImage;
