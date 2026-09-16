"use client";

import { CalendarRange, Signpost, TentTree } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  PUBLIC_HERO_DESCRIPTION_CLASS_NAME,
  PUBLIC_META_BADGE_CLASS_NAME,
  PUBLIC_META_DATE_CLASS_NAME,
  PUBLIC_PANEL_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { AppImage } from "@/components/ui/app-image";
import { formatFinnishDateRange } from "@/lib/fi-date";
import type { PublicTripArchiveItem } from "@/lib/public-trips";
import { appRoutes } from "@/lib/routes";

interface TripArchiveCardProps {
  onDetailNavigate: () => void;
  trip: PublicTripArchiveItem;
}

export const TripArchiveCard = ({ onDetailNavigate, trip }: TripArchiveCardProps) => {
  const t = useTranslations("tripsArchive");
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const featuredImage = trip.featuredImage;
  const featuredImageUrl = featuredImage?.url;
  const shouldShowFeaturedImage = featuredImage !== null && featuredImageUrl !== failedImageUrl;

  return (
    <li className="flex min-w-0">
      <article
        aria-labelledby={`trip-archive-card-title-${trip.id}`}
        className={`${PUBLIC_PANEL_CLASS_NAME} flex w-full min-w-0 flex-col overflow-hidden p-0`}
      >
        <div
          className="relative flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden bg-slate-200/65 dark:bg-slate-900/70"
          aria-hidden="true"
        >
          {shouldShowFeaturedImage ? (
            <AppImage
              src={featuredImage.url}
              alt=""
              fill
              sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1023px) calc(50vw - 3rem), 480px"
              className="object-cover object-center"
              onError={() => setFailedImageUrl(featuredImageUrl ?? null)}
            />
          ) : (
            <TentTree className="h-12 w-12 text-primary" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
          <h2
            id={`trip-archive-card-title-${trip.id}`}
            className="break-words text-xl font-semibold tracking-tight"
          >
            {trip.name}
          </h2>

          <div className="mt-3 flex flex-wrap gap-2 text-sm text-foreground/75 dark:text-sky-100/75">
            <span className={PUBLIC_META_DATE_CLASS_NAME}>
              {trip.dateRange !== null ? (
                <time dateTime={trip.dateRange.start}>
                  {formatFinnishDateRange(trip.dateRange.start, trip.dateRange.end)}
                </time>
              ) : (
                t("missingDate")
              )}
            </span>
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

          {trip.descriptionExcerpt !== null && (
            <p className={`mt-4 line-clamp-3 ${PUBLIC_HERO_DESCRIPTION_CLASS_NAME}`}>
              {trip.descriptionExcerpt}
            </p>
          )}

          <div className="mt-6 flex flex-1 items-end">
            <Link
              href={appRoutes.trip(trip.slug)}
              prefetch={false}
              aria-label={t("readMoreLabel", { name: trip.name })}
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
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("readMore")}
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
};
