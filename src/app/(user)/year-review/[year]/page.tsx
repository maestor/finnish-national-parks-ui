import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PUBLIC_PAGE_SHELL_CLASS_NAME } from "@/components/layout/public-page-styles";
import {
  buildYearReviewCardLabels,
  YearReviewCard,
} from "@/components/year-review/year-review-card";
import { buildPageMetadata } from "@/lib/page-metadata";
import { buildAvailableVisitYears, fetchVisitsTimeline } from "@/lib/public-visits";
import { buildYearReviewStats } from "@/lib/year-review";

interface YearReviewPageProps {
  params: Promise<{ year: string }>;
}

const YEAR_PARAM_PATTERN = /^\d{4}$/;

// Reads use force-cache tagged fetches, but force-dynamic keeps Next from
// prerendering this page at build time, when no backend is reachable.
export const dynamic = "force-dynamic";

export const generateMetadata = async ({ params }: YearReviewPageProps) => {
  const [{ year }, t, metadataT] = await Promise.all([
    params,
    getTranslations("yearReview"),
    getTranslations("metadata"),
  ]);

  return buildPageMetadata(t("shareTitle", { year }), metadataT("title"), {
    description: t("shareDescription", { year }),
  });
};

const YearReviewPage = async ({ params }: YearReviewPageProps) => {
  const { year: yearParam } = await params;

  if (!YEAR_PARAM_PATTERN.test(yearParam)) {
    notFound();
  }

  const year = Number.parseInt(yearParam, 10);
  const { visits } = await fetchVisitsTimeline();
  const availableYears = buildAvailableVisitYears(visits);

  if (!availableYears.includes(year)) {
    notFound();
  }

  const t = await getTranslations("yearReview");
  const stats = buildYearReviewStats(visits, year);

  return (
    <div className={PUBLIC_PAGE_SHELL_CLASS_NAME}>
      <YearReviewCard stats={stats} labels={buildYearReviewCardLabels(t)} />
    </div>
  );
};

export default YearReviewPage;
