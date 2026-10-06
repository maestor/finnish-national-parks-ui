import { CalendarRange, Scan } from "lucide-react";
import { useTranslations } from "next-intl";
import { PUBLIC_META_BADGE_CLASS_NAME } from "@/components/layout/public-page-styles";
import { ParkTypeBadge } from "@/components/park/park-type-badge";
import { PublicMemoryCard } from "@/components/ui/public-memory-card";
import type { HomeSummary } from "@/lib/frontend-summaries";
import { getParkTypeDisplayName } from "@/lib/parks";
import { appRoutes } from "@/lib/routes";

export const HomeParkMemoryCard = ({
  park,
  imageSizes,
}: {
  park: NonNullable<HomeSummary["featuredPark"]>;
  imageSizes: string | undefined;
}) => {
  const t = useTranslations("home.specialVisit");
  const parkT = useTranslations("park");
  return (
    <PublicMemoryCard
      id={`home-special-park-${park.slug}`}
      href={appRoutes.park(park.slug)}
      title={park.name}
      headingLevel={4}
      featuredImage={park.featuredImage}
      imageSizes={imageSizes}
      ribbonLabel={t("parkRibbon")}
      descriptionExcerpt={park.descriptionExcerpt}
      descriptionPlaceholder={t("parkDescriptionPlaceholder")}
      readMore={t("readPark")}
      dateLabel={t("visitCount", { count: park.visitCount })}
      metadata={
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
          <ParkTypeBadge label={getParkTypeDisplayName(park)} />
          {park.establishmentYear !== null && (
            <span className={PUBLIC_META_BADGE_CLASS_NAME} title={parkT("established")}>
              <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">{parkT("established")} </span>
              {park.establishmentYear}
            </span>
          )}
          {park.areaKm2 !== null && (
            <span className={PUBLIC_META_BADGE_CLASS_NAME} title={parkT("area")}>
              <Scan className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">{parkT("area")} </span>
              {park.areaKm2.toLocaleString("fi-FI")} km²
            </span>
          )}
        </div>
      }
    />
  );
};
