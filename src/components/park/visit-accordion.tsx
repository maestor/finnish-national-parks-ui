"use client";

import { ChevronDown, FileText, Images, Route, TentTree, User } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { EditVisitLink } from "@/components/visits/edit-visit-link";
import { VisitImageGallery } from "@/components/visits/visit-image-gallery";
import { formatFinnishDate } from "@/lib/fi-date";
import type { Visit } from "@/lib/parks";
import { createParkVisitHref } from "@/lib/public-visits";
import { appRoutes } from "@/lib/routes";
import { getVisitSeason, SEASON_EMOJIS } from "@/lib/seasons";

interface VisitAccordionProps {
  initialOpenVisitId?: number | null;
  parkSlug: string;
  visits: Visit[];
  isEditable?: boolean;
  isPreview?: boolean;
}

interface SeasonPresentation {
  badgeClass: string;
  borderClass: string;
  emoji: string;
}

interface VisitAuthorDetails {
  createdAt: string;
  showUpdatedAt: boolean;
  updatedAt: string;
}

const VISIT_CARD_CLASS_NAME =
  "rounded-lg rounded-[1.75rem] border border-border theme-memory shadow-[0_20px_44px_rgba(var(--shadow-rgb),0.16)] backdrop-blur-xl dark:shadow-[0_24px_52px_rgba(var(--shadow-rgb),0.32)]";
const VISIT_BADGE_CLASS_NAME =
  "inline-flex items-center justify-center rounded-full theme-memory px-2.5 py-1 text-sm leading-none font-bold text-link shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.08)]";
const DETAIL_SECTION_HEADING_CLASS_NAME =
  "flex items-center gap-2 border-b border-border pb-2 text-base font-semibold";
const ROUTE_BADGE_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 theme-memory px-2.5 py-1 text-sm leading-none font-semibold text-emerald-900 shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] dark:border-emerald-300/15 dark:text-emerald-200 dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.08)]";
const IMAGE_BADGE_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-full border border-border theme-memory px-2.5 py-1 text-sm leading-none font-semibold text-link shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.08)]";
const TRIP_LINK_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-full border border-border theme-memory px-2.5 py-1 text-sm leading-none font-semibold text-link shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] transition-colors hover:theme-memory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.08)]";

const hasExpandableContent = (visit: Visit) => {
  const hasImages = (visit.images?.length ?? 0) > 0;
  return !!visit.note || !!visit.author || hasImages;
};

const getSeasonPresentation = (dateStr: string): SeasonPresentation => {
  const season = getVisitSeason(dateStr);
  if (season === "spring") {
    return {
      emoji: SEASON_EMOJIS.spring,
      borderClass: "border-l-emerald-600 dark:border-l-emerald-400",
      badgeClass: "bg-emerald-600/15 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
    };
  }
  if (season === "summer") {
    return {
      emoji: SEASON_EMOJIS.summer,
      borderClass: "border-l-amber-500 dark:border-l-amber-300",
      badgeClass: "bg-amber-500/15 text-amber-800 dark:bg-amber-300/15 dark:text-amber-200",
    };
  }
  if (season === "autumn") {
    return {
      emoji: SEASON_EMOJIS.autumn,
      borderClass: "border-l-orange-600 dark:border-l-orange-400",
      badgeClass: "bg-orange-600/15 text-orange-800 dark:bg-orange-400/15 dark:text-orange-200",
    };
  }
  return {
    emoji: SEASON_EMOJIS.winter,
    borderClass: "border-l-sky-600 dark:border-l-cyan-400",
    badgeClass: "bg-sky-600/15 text-sky-800 dark:bg-cyan-400/15 dark:text-cyan-200",
  };
};

const getVisitAuthorDetails = (visit: Visit): VisitAuthorDetails => {
  const createdAt = formatFinnishDate(visit.createdAt);
  const updatedAt = formatFinnishDate(visit.updatedAt);

  return {
    createdAt,
    updatedAt,
    showUpdatedAt: createdAt !== updatedAt,
  };
};

export const VisitAccordion = ({
  visits,
  parkSlug,
  isEditable = false,
  isPreview = false,
  initialOpenVisitId = null,
}: VisitAccordionProps) => {
  const t = useTranslations("park");
  const firstExpandableVisitId =
    [...visits]
      .sort((a, b) => new Date(b.visitedOn).getTime() - new Date(a.visitedOn).getTime())
      .find((visit) => hasExpandableContent(visit))?.id ?? null;
  const [openId, setOpenId] = useState<number | null>(() => {
    if (
      initialOpenVisitId !== null &&
      visits.some((visit) => visit.id === initialOpenVisitId && hasExpandableContent(visit))
    ) {
      return initialOpenVisitId;
    }

    return firstExpandableVisitId;
  });

  const sortedByDateAsc = [...visits].sort(
    (a, b) => new Date(a.visitedOn).getTime() - new Date(b.visitedOn).getTime(),
  );

  const visitNumbers = new Map<number, number>();
  for (let i = 0; i < sortedByDateAsc.length; i++) {
    visitNumbers.set(sortedByDateAsc[i].id, i + 1);
  }

  const displayVisits = [...visits].sort(
    (a, b) => new Date(b.visitedOn).getTime() - new Date(a.visitedOn).getTime(),
  );
  const toggle = (id: number, isExpandable: boolean) => {
    if (!isExpandable) return;
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <div className="space-y-3">
      {displayVisits.map((visit) => {
        const number = visitNumbers.get(visit.id) ?? 0;
        const imageCount = visit.images?.length ?? 0;
        const hasImages = imageCount > 0;
        const isExpandable = hasExpandableContent(visit);
        const isHighlighted = initialOpenVisitId === visit.id;
        const isOpen = openId === visit.id;
        const season = getSeasonPresentation(visit.visitedOn);
        const authorDetails = visit.author ? getVisitAuthorDetails(visit) : null;
        const draftStatusBadge = visit.status === "draft" && (
          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
            {t("draftStatus")}
          </span>
        );
        const visitHref = createParkVisitHref({
          parkSlug,
          visitId: visit.id,
        });

        if (!isExpandable) {
          return (
            <div
              key={visit.id}
              className={`flex items-center justify-between ${VISIT_CARD_CLASS_NAME} ${season.borderClass} ${isHighlighted ? "ring-2 ring-primary/35 ring-offset-2 ring-offset-background dark:ring-offset-slate-950/44" : ""} border-l-4 px-4 py-3`}
            >
              <span className="flex flex-wrap items-center gap-2.5 text-sm font-medium">
                <span
                  aria-hidden="true"
                  className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-sm leading-none ${season.badgeClass}`}
                >
                  {season.emoji}
                </span>
                <span className={VISIT_BADGE_CLASS_NAME}>{t("visitNumber", { number })}</span>
                <span className="text-base">{formatFinnishDate(visit.visitedOn)}</span>
                {draftStatusBadge}
                {!!visit.route && (
                  <span className={ROUTE_BADGE_CLASS_NAME}>
                    <Route className="h-3.5 w-3.5" aria-hidden="true" />
                    {visit.route}
                  </span>
                )}
                {visit.trip !== null && isPreview !== true && (
                  <Link href={appRoutes.trip(visit.trip.slug)} className={TRIP_LINK_CLASS_NAME}>
                    <TentTree className="h-3.5 w-3.5" aria-hidden="true" />
                    {visit.trip.name}
                  </Link>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {visit.status !== "draft" && isPreview !== true && (
                  <CopyLinkButton
                    href={visitHref}
                    label={t("copyVisitLink")}
                    copiedLabel={t("visitLinkCopied")}
                  />
                )}
                {isEditable === true && <EditVisitLink visitId={visit.id} />}
              </span>
            </div>
          );
        }

        return (
          <div
            key={visit.id}
            className={`overflow-hidden ${VISIT_CARD_CLASS_NAME} ${season.borderClass} ${isHighlighted ? "ring-2 ring-primary/35 ring-offset-2 ring-offset-background dark:ring-offset-slate-950/44" : ""} border-l-4`}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => toggle(visit.id, isExpandable)}
                className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 text-left transition-colors hover:text-muted-foreground"
                aria-expanded={isOpen}
                title={isOpen ? t("hideDetails") : t("showDetails")}
                aria-label={isOpen ? t("hideDetails") : t("showDetails")}
              >
                <span className="flex flex-wrap items-center gap-2.5 text-sm font-medium">
                  <span
                    aria-hidden="true"
                    className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-sm leading-none ${season.badgeClass}`}
                  >
                    {season.emoji}
                  </span>
                  <span className={VISIT_BADGE_CLASS_NAME}>{t("visitNumber", { number })}</span>
                  <span className="text-base">{formatFinnishDate(visit.visitedOn)}</span>
                  {draftStatusBadge}
                  {!!visit.route && (
                    <span className={ROUTE_BADGE_CLASS_NAME}>
                      <Route className="h-3.5 w-3.5" aria-hidden="true" />
                      {visit.route}
                    </span>
                  )}
                  {hasImages && (
                    <span className={IMAGE_BADGE_CLASS_NAME}>
                      <Images className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("imageCount", { count: imageCount })}
                    </span>
                  )}
                  {visit.trip !== null && isPreview !== true && (
                    <Link
                      href={appRoutes.trip(visit.trip.slug)}
                      className={TRIP_LINK_CLASS_NAME}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <TentTree className="h-3.5 w-3.5" aria-hidden="true" />
                      {visit.trip.name}
                    </Link>
                  )}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <span className="flex shrink-0 items-center gap-1.5">
                {visit.status !== "draft" && isPreview !== true && (
                  <CopyLinkButton
                    href={visitHref}
                    label={t("copyVisitLink")}
                    copiedLabel={t("visitLinkCopied")}
                    onClick={(event) => event.stopPropagation()}
                  />
                )}
                {isEditable === true && <EditVisitLink visitId={visit.id} />}
              </span>
            </div>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden min-h-0">
                <div className="space-y-3 border-t border-border bg-control px-4 py-3">
                  {!!visit.note && (
                    <>
                      <h3 className={DETAIL_SECTION_HEADING_CLASS_NAME}>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {t("detailsTitle")}
                      </h3>
                      <MarkdownContent>{visit.note}</MarkdownContent>
                    </>
                  )}
                  {hasImages && (
                    <>
                      <h3 className={DETAIL_SECTION_HEADING_CLASS_NAME}>
                        <Images className="h-4 w-4 text-muted-foreground" />
                        {t("imagesTitle")}
                      </h3>
                      <VisitImageGallery
                        images={visit.images}
                        centerThumbnailsWhenStatic
                        privateMedia={isPreview || visit.status === "draft"}
                      />
                    </>
                  )}
                  {authorDetails !== null && (
                    <>
                      <h3 className={DETAIL_SECTION_HEADING_CLASS_NAME}>
                        <User className="h-4 w-4 text-muted-foreground" />
                        {t("authorTitle")}
                      </h3>
                      <p className="text-sm">
                        {visit.author}, {authorDetails.createdAt}
                        {authorDetails.showUpdatedAt === true && (
                          <span>
                            {" "}
                            ({t("updatedAtLabel")} {authorDetails.updatedAt})
                          </span>
                        )}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
