import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DateRangeReviewStory } from "@/components/date-range-review/date-range-review-story";
import { PUBLIC_PAGE_SHELL_CLASS_NAME } from "@/components/layout/public-page-styles";
import { cn } from "@/lib/cn";
import {
  buildDateRangeReviewShareDescription,
  isDateRangeReviewShareId,
  readDateRangeReviewShareOrNull,
} from "@/lib/date-range-review";
import { buildPageMetadata } from "@/lib/page-metadata";
import { appRoutes } from "@/lib/routes";

interface PublicDateRangeReviewSharePageProps {
  params: Promise<{ shareId: string }>;
}

export const dynamic = "force-dynamic";

const readShareOrNotFound = async (shareId: string) => {
  if (!isDateRangeReviewShareId(shareId)) {
    notFound();
  }

  const share = await readDateRangeReviewShareOrNull(shareId);

  if (share === null) {
    notFound();
  }

  return share;
};

export const generateMetadata = async ({ params }: PublicDateRangeReviewSharePageProps) => {
  const { shareId } = await params;
  const [share, t, metadataT] = await Promise.all([
    readShareOrNotFound(shareId),
    getTranslations("dateRangeReview"),
    getTranslations("metadata"),
  ]);

  return buildPageMetadata(t("shareTitle", { name: share.overview.name }), metadataT("title"), {
    description: buildDateRangeReviewShareDescription({
      imageCount: share.story.summary.imageCount,
      name: share.overview.name,
      t,
      tripCount: share.story.summary.tripCount,
      visitCount: share.story.summary.visitCount,
    }),
    socialImagePath: appRoutes.dateRangeReviewShareImage(shareId),
  });
};

const PublicDateRangeReviewSharePage = async ({ params }: PublicDateRangeReviewSharePageProps) => {
  const { shareId } = await params;
  const share = await readShareOrNotFound(shareId);

  return (
    <div className={cn(PUBLIC_PAGE_SHELL_CLASS_NAME, "pb-6 pt-0")}>
      <DateRangeReviewStory
        overview={share.overview}
        story={share.story}
        mode="public"
        headingLevel={1}
        publishedAt={share.publishedAt}
      />
    </div>
  );
};

export default PublicDateRangeReviewSharePage;
