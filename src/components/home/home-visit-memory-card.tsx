import { Images, Route } from "lucide-react";
import { useTranslations } from "next-intl";
import { PUBLIC_META_BADGE_CLASS_NAME } from "@/components/layout/public-page-styles";
import { PublicMemoryCard } from "@/components/ui/public-memory-card";
import { formatFinnishDate } from "@/lib/fi-date";
import type { HomeSummary } from "@/lib/frontend-summaries";
import { createParkVisitHref } from "@/lib/public-visits";

interface HomeVisitMemoryCardProps {
  visit: NonNullable<HomeSummary["latestStandaloneVisit"]>;
  idPrefix: string;
  headingLevel: 3 | 4;
  imageLoading: "eager" | "lazy";
  imageSizes?: string;
  ribbonLabel?: string;
}

export const HomeVisitMemoryCard = ({
  visit,
  idPrefix,
  headingLevel,
  imageLoading,
  imageSizes,
  ribbonLabel,
}: HomeVisitMemoryCardProps) => {
  const t = useTranslations("home.featured");
  const parkT = useTranslations("park");
  return (
    <PublicMemoryCard
      id={`${idPrefix}-${visit.id}`}
      title={visit.park.name}
      headingLevel={headingLevel}
      href={createParkVisitHref({ parkSlug: visit.park.slug, visitId: visit.id })}
      featuredImage={visit.featuredImage}
      imageLoading={imageLoading}
      imageSizes={imageSizes}
      ribbonLabel={ribbonLabel}
      descriptionExcerpt={visit.descriptionExcerpt}
      descriptionPlaceholder={t("notePlaceholder")}
      readMore={t("readVisit")}
      dateLabel={<time dateTime={visit.visitedOn}>{formatFinnishDate(visit.visitedOn)}</time>}
      metadata={
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
          {!!visit.route && (
            <span className={`${PUBLIC_META_BADGE_CLASS_NAME} min-w-0`}>
              <Route className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="wrap-anywhere">{visit.route}</span>
            </span>
          )}
          <span className={PUBLIC_META_BADGE_CLASS_NAME}>
            <Images className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {parkT("imageCount", { count: visit.imageCount })}
          </span>
        </div>
      }
    />
  );
};
