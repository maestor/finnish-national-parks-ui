"use client";

import { ChevronDown, FileText, Images, MapPin, TentTree, User } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParkTrailNavigation } from "@/components/park/park-trail-navigation";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { EditVisitLink } from "@/components/visits/edit-visit-link";
import { VisitImageGallery } from "@/components/visits/visit-image-gallery";
import { VisitTrailSection } from "@/components/visits/visit-trail-section";
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
  "inline-flex items-center justify-center rounded-full theme-memory px-1.5 py-1 text-xs leading-none font-bold text-link @sm:px-2.5 @sm:text-sm shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.08)]";
const DETAIL_SECTION_HEADING_CLASS_NAME =
  "flex items-center gap-2 border-b border-border pb-2 text-base font-semibold";
const METADATA_BADGE_CLASS_NAME =
  "rounded-full border theme-memory px-2.5 py-1 text-sm font-semibold shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.08)]";
const WRAPPING_BADGE_CLASS_NAME = `${METADATA_BADGE_CLASS_NAME} inline-flex min-w-0 max-w-full items-center gap-1.5 leading-tight`;
const HEADER_ACTION_CLASS_NAME =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const hasExpandableContent = (visit: Visit) => {
  const hasImages = (visit.images?.length ?? 0) > 0;
  return !!visit.note || !!visit.author || hasImages || (visit.trails?.length ?? 0) > 0;
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
  const trailNavigation = useParkTrailNavigation();
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

  const handledVisit = useRef<number | null>(null);
  const revealVisit = useCallback(
    (id: number, scroll: boolean) => {
      if (!visits.some((visit) => visit.id === id)) return false;
      setOpenId(id);
      handledVisit.current = id;
      if (scroll)
        requestAnimationFrame(() => {
          const card = document.getElementById(`park-visit-${id}`);
          const target = card?.querySelector<HTMLButtonElement>("button[aria-expanded]") ?? card;
          target?.focus({ preventScroll: true });
          card?.scrollIntoView?.({
            behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
            block: "start",
          });
        });
      return true;
    },
    [visits],
  );
  useEffect(() => {
    if (initialOpenVisitId === null) handledVisit.current = null;
    if (initialOpenVisitId !== null && handledVisit.current !== initialOpenVisitId) {
      revealVisit(initialOpenVisitId, true);
    }
  }, [initialOpenVisitId, revealVisit]);
  useEffect(() => {
    const navigate = (event: Event) => revealVisit((event as CustomEvent<number>).detail, true);
    window.addEventListener("park-visit-navigation", navigate);
    return () => window.removeEventListener("park-visit-navigation", navigate);
  }, [revealVisit]);

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
  const toggle = (id: number) => {
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
        const trip = isPreview ? null : visit.trip;
        const canCopy = visit.status !== "draft" && !isPreview;
        const isDraft = visit.status === "draft";
        const detailsLabel = isOpen ? t("hideDetails") : t("showDetails");
        const numberId = `visit-number-${visit.id}`;
        const dateId = `visit-date-${visit.id}`;
        const visitHref = createParkVisitHref({
          parkSlug,
          visitId: visit.id,
        });

        return (
          <div
            key={visit.id}
            id={`park-visit-${visit.id}`}
            tabIndex={-1}
            className={`@container scroll-mt-32 overflow-hidden ${VISIT_CARD_CLASS_NAME} ${season.borderClass} ${isHighlighted ? "ring-2 ring-primary/35 ring-offset-2 ring-offset-background dark:ring-offset-slate-950/44" : ""} border-l-4`}
          >
            <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 px-3 py-2 @xl:grid-cols-[auto_minmax(0,1fr)_auto] @xl:px-4">
              <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-x-1.5 @sm:gap-x-2">
                <span
                  aria-hidden="true"
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm leading-none @sm:w-8 ${season.badgeClass}`}
                >
                  {season.emoji}
                </span>
                <span id={numberId} className={VISIT_BADGE_CLASS_NAME}>
                  {t("visitNumber", { number })}
                </span>
                <time
                  id={dateId}
                  dateTime={visit.visitedOn}
                  className="text-sm leading-8 font-medium @sm:text-base"
                >
                  {formatFinnishDate(visit.visitedOn)}
                </time>
              </div>
              {(isExpandable || canCopy === true || isEditable === true) && (
                <div className="col-start-2 row-start-1 flex items-center gap-0.5 @xl:col-start-3">
                  {isExpandable && (
                    <button
                      type="button"
                      onClick={() => toggle(visit.id)}
                      className={`${HEADER_ACTION_CLASS_NAME} cursor-pointer after:absolute after:inset-0`}
                      aria-expanded={isOpen}
                      aria-controls={`visit-details-${visit.id}`}
                      aria-describedby={`${numberId} ${dateId}`}
                      title={detailsLabel}
                      aria-label={detailsLabel}
                    >
                      <ChevronDown
                        className={`size-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                  {canCopy === true && (
                    <CopyLinkButton
                      className={`relative ${HEADER_ACTION_CLASS_NAME}`}
                      href={visitHref}
                      iconClassName="size-4"
                      label={t("copyVisitLink")}
                      copiedLabel={t("visitLinkCopied")}
                    />
                  )}
                  {isEditable === true && (
                    <EditVisitLink
                      className={`relative ${HEADER_ACTION_CLASS_NAME}`}
                      visitId={visit.id}
                    />
                  )}
                </div>
              )}
              {(trip !== null || !!visit.route || hasImages || isDraft) && (
                <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 @xl:col-span-1 @xl:col-start-2 @xl:row-start-1 @xl:min-h-8">
                  {trip !== null && (
                    <Link
                      href={appRoutes.trip(trip.slug)}
                      className={`relative ${WRAPPING_BADGE_CLASS_NAME} border-border text-link focus-visible:outline-2 focus-visible:outline-ring`}
                    >
                      <TentTree className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="wrap-anywhere text-balance">{trip.name}</span>
                    </Link>
                  )}
                  {!!visit.route && (
                    <span
                      className={`${WRAPPING_BADGE_CLASS_NAME} border-emerald-200/70 text-emerald-900 dark:border-emerald-300/15 dark:text-emerald-200`}
                    >
                      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="wrap-anywhere text-balance">{visit.route}</span>
                    </span>
                  )}
                  {hasImages && (
                    <span
                      className={`inline-flex items-center gap-1.5 ${METADATA_BADGE_CLASS_NAME} border-border leading-tight text-link`}
                    >
                      <Images className="size-3.5" aria-hidden="true" />
                      <span aria-hidden="true">{imageCount}</span>
                      <span className="sr-only">{t("imageCount", { count: imageCount })}</span>
                    </span>
                  )}
                  {isDraft && (
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs leading-none font-semibold text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                      {t("draftStatus")}
                    </span>
                  )}
                </div>
              )}
            </div>
            {isExpandable && (
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div
                  id={`visit-details-${visit.id}`}
                  inert={!isOpen}
                  className="overflow-hidden min-h-0"
                >
                  <div className="space-y-3 border-t border-border bg-control px-4 py-3">
                    <VisitTrailSection
                      trails={visit.trails}
                      headingLevel={3}
                      navigation={trailNavigation}
                    />
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
            )}
          </div>
        );
      })}
    </div>
  );
};
