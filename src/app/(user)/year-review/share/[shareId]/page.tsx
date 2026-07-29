import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PUBLIC_PAGE_SHELL_CLASS_NAME } from "@/components/layout/public-page-styles";
import { YearReviewStory } from "@/components/year-review/year-review-story";
import { cn } from "@/lib/cn";
import { buildPageMetadata } from "@/lib/page-metadata";
import {
  buildYearReviewShareDescription,
  isYearReviewShareId,
  readYearReviewShareOrNull,
} from "@/lib/year-review";

interface PublicYearReviewSharePageProps {
  params: Promise<{ shareId: string }>;
}

// The backend stores and serves share snapshots on demand, so this route must
// stay dynamic instead of prerendering at build time when no backend exists.
export const dynamic = "force-dynamic";

const readShareOrNotFound = async (shareId: string) => {
  if (!isYearReviewShareId(shareId)) {
    notFound();
  }

  const share = await readYearReviewShareOrNull(shareId);

  if (share === null) {
    notFound();
  }

  return share;
};

export const generateMetadata = async ({ params }: PublicYearReviewSharePageProps) => {
  const { shareId } = await params;
  const [share, t, metadataT] = await Promise.all([
    readShareOrNotFound(shareId),
    getTranslations("yearReview"),
    getTranslations("metadata"),
  ]);

  return buildPageMetadata(t("shareTitle", { year: share.year }), metadataT("title"), {
    description: buildYearReviewShareDescription({
      year: share.year,
      visitCount: share.story.summary.visitCount,
      newParkCount: share.story.summary.newParkCount,
      imageCount: share.story.summary.imageCount,
      t,
    }),
  });
};

const PublicYearReviewSharePage = async ({ params }: PublicYearReviewSharePageProps) => {
  const { shareId } = await params;
  const share = await readShareOrNotFound(shareId);

  return (
    <div className={cn(PUBLIC_PAGE_SHELL_CLASS_NAME, "pb-6 pt-0")}>
      <YearReviewStory
        story={share.story}
        mode="public"
        headingLevel={1}
        publishedAt={share.publishedAt}
      />
    </div>
  );
};

export default PublicYearReviewSharePage;
