"use client";

import { TentTree } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import {
  PUBLIC_BREADCRUMB_PAGE_SHELL_CLASS_NAME,
  PUBLIC_CONTENT_PANEL_CLASS_NAME,
  PUBLIC_EYEBROW_BADGE_CLASS_NAME,
  PUBLIC_HERO_BREADCRUMB_CLASS_NAME,
  PUBLIC_HERO_DESCRIPTION_CLASS_NAME,
  PUBLIC_HERO_HEADING_STACK_CLASS_NAME,
  PUBLIC_HERO_PANEL_CLASS_NAME,
  PUBLIC_HERO_TITLE_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { renderMultilineText } from "@/lib/multiline-text";
import type { PublicTripArchiveResponse } from "@/lib/public-trips";
import { appRoutes } from "@/lib/routes";
import { TripArchiveList } from "./trip-archive-list";

interface TripArchivePageProps {
  initialResponse: PublicTripArchiveResponse | null;
}

export const TripArchivePage = ({ initialResponse }: TripArchivePageProps) => {
  const t = useTranslations("tripsArchive");

  return (
    <div className={PUBLIC_BREADCRUMB_PAGE_SHELL_CLASS_NAME}>
      <section className={PUBLIC_HERO_PANEL_CLASS_NAME}>
        <AppBreadcrumbs path={appRoutes.trips} className={PUBLIC_HERO_BREADCRUMB_CLASS_NAME} />
        <div className={PUBLIC_HERO_HEADING_STACK_CLASS_NAME}>
          <div className={PUBLIC_EYEBROW_BADGE_CLASS_NAME}>
            <TentTree className="h-4 w-4" aria-hidden="true" />
            <span>{t("eyebrow")}</span>
          </div>
          <h1 className={PUBLIC_HERO_TITLE_CLASS_NAME}>{t("title")}</h1>
          <p className={PUBLIC_HERO_DESCRIPTION_CLASS_NAME}>
            {renderMultilineText(t("description"))}
          </p>
        </div>
      </section>

      <section
        className={PUBLIC_CONTENT_PANEL_CLASS_NAME}
        aria-labelledby="trip-archive-list-title"
      >
        <h2 id="trip-archive-list-title" className="sr-only">
          {t("listLabel")}
        </h2>
        <TripArchiveList initialResponse={initialResponse} />
      </section>
    </div>
  );
};
