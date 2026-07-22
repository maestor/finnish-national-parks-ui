import { notFound } from "next/navigation";
import { buildAvailableVisitYears, fetchVisitsTimeline } from "@/lib/public-visits";
import { createSocialPreviewImageResponse } from "@/lib/social-preview-image";
import { buildYearReviewStats } from "@/lib/year-review";
import messages from "../../../../../messages/fi.json";

export const alt = messages.yearReview.ogAlt;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Stats come from a force-cache tagged fetch, but force-dynamic keeps Next from
// prerendering this image route at build time, when no backend is reachable.
export const dynamic = "force-dynamic";

const YEAR_PARAM_PATTERN = /^\d{4}$/;

const withYear = (template: string, year: string) => template.replace("{year}", year);

const YearReviewOpenGraphImage = async ({ params }: { params: Promise<{ year: string }> }) => {
  const { year: yearParam } = await params;
  const { visits } = await fetchVisitsTimeline();
  const year = Number.parseInt(yearParam, 10);

  if (!YEAR_PARAM_PATTERN.test(yearParam) || !buildAvailableVisitYears(visits).includes(year)) {
    notFound();
  }

  const stats = buildYearReviewStats(visits, year);
  const highlights = [
    `${stats.visitCount} ${messages.yearReview.stats.visits.toLowerCase()}`,
    `${stats.newParkCount} ${messages.yearReview.stats.newParks.toLowerCase()}`,
    `${stats.imageCount} ${messages.yearReview.stats.images.toLowerCase()}`,
  ];

  return createSocialPreviewImageResponse({
    title: withYear(messages.yearReview.shareTitle, yearParam),
    description: withYear(messages.yearReview.shareDescription, yearParam),
    highlights,
    variant: "landscape",
    width: size.width,
    height: size.height,
  });
};

export default YearReviewOpenGraphImage;
