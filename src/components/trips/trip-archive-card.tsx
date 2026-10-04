"use client";

import { CalendarRange, Signpost } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MouseEventHandler } from "react";
import { PUBLIC_META_BADGE_CLASS_NAME } from "@/components/layout/public-page-styles";
import { PublicMemoryCard } from "@/components/ui/public-memory-card";
import { formatFinnishDateRange } from "@/lib/fi-date";
import type { PublicTripArchiveItem } from "@/lib/public-trips";
import { appRoutes } from "@/lib/routes";

interface TripMemoryCardProps {
  trip: Omit<PublicTripArchiveItem, "createdAt">;
  headingLevel: 2 | 4;
  imageLoading?: "eager" | "lazy";
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export const TripMemoryCard = ({
  trip,
  headingLevel,
  imageLoading,
  onClick,
}: TripMemoryCardProps) => {
  const t = useTranslations("tripsArchive");
  return (
    <PublicMemoryCard
      id={`trip-card-${trip.id}`}
      href={appRoutes.trip(trip.slug)}
      title={trip.name}
      headingLevel={headingLevel}
      onClick={onClick}
      featuredImage={trip.featuredImage}
      imageLoading={imageLoading}
      descriptionExcerpt={trip.descriptionExcerpt}
      descriptionPlaceholder={t("descriptionPlaceholder")}
      readMore={t("readMore")}
      dateLabel={
        trip.dateRange !== null ? (
          <time dateTime={trip.dateRange.start}>
            {formatFinnishDateRange(trip.dateRange.start, trip.dateRange.end)}
          </time>
        ) : (
          t("missingDate")
        )
      }
      metadata={
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className={PUBLIC_META_BADGE_CLASS_NAME}>
            <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {trip.visitCount} {t("visitCount", { count: trip.visitCount })}
          </span>
          {trip.stopCount > 0 && (
            <span className={PUBLIC_META_BADGE_CLASS_NAME}>
              <Signpost className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {trip.stopCount} {t("stopCount", { count: trip.stopCount })}
            </span>
          )}
        </div>
      }
    />
  );
};

interface TripArchiveCardProps {
  onDetailNavigate: () => void;
  trip: PublicTripArchiveItem;
  imageLoading?: "eager" | "lazy";
}

export const TripArchiveCard = ({ onDetailNavigate, trip, imageLoading }: TripArchiveCardProps) => (
  <li className="flex min-w-0">
    <TripMemoryCard
      trip={trip}
      headingLevel={2}
      imageLoading={imageLoading}
      onClick={(event) => {
        if (
          event.button === 0 &&
          !event.defaultPrevented &&
          !event.altKey &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey
        ) {
          onDetailNavigate();
        }
      }}
    />
  </li>
);
