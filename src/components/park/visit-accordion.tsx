"use client";

import { EditVisitLink } from "@/components/visits/edit-visit-link";
import { VisitImageGallery } from "@/components/visits/visit-image-gallery";
import { formatFinnishDate } from "@/lib/fi-date";
import type { Visit } from "@/lib/parks";
import { ChevronDown, FileText, Images, Route, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface VisitAccordionProps {
  visits: Visit[];
  isEditable?: boolean;
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
  "rounded-lg rounded-[1.75rem] border border-white/45 bg-white/68 shadow-[0_20px_44px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/44 dark:shadow-[0_24px_52px_rgba(2,6,23,0.32)]";
const VISIT_BADGE_CLASS_NAME =
  "inline-flex items-center justify-center rounded-full bg-[linear-gradient(145deg,rgba(22,101,52,0.12),rgba(37,99,235,0.12))] px-2.5 py-1 text-sm leading-none font-bold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:bg-[linear-gradient(145deg,rgba(22,101,52,0.22),rgba(37,99,235,0.18))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";
const DETAIL_SECTION_HEADING_CLASS_NAME =
  "flex items-center gap-2 border-b border-white/35 pb-2 text-base font-semibold dark:border-white/10";
const ROUTE_BADGE_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-[linear-gradient(145deg,rgba(22,101,52,0.12),rgba(16,185,129,0.18))] px-2.5 py-1 text-sm leading-none font-semibold text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-emerald-300/15 dark:bg-[linear-gradient(145deg,rgba(22,101,52,0.24),rgba(16,185,129,0.16))] dark:text-emerald-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";
const IMAGE_BADGE_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-full border border-sky-200/70 bg-[linear-gradient(145deg,rgba(22,101,52,0.08),rgba(37,99,235,0.12))] px-2.5 py-1 text-sm leading-none font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-sky-300/15 dark:bg-[linear-gradient(145deg,rgba(22,101,52,0.18),rgba(37,99,235,0.16))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

const hasExpandableContent = (visit: Visit) => {
  const hasImages = (visit.images?.length ?? 0) > 0;
  return !!visit.note || !!visit.author || hasImages;
};

const getSeasonPresentation = (dateStr: string): SeasonPresentation => {
  const month = new Date(dateStr).getMonth() + 1;
  if (month >= 3 && month <= 5) {
    return {
      emoji: "🌱",
      borderClass: "border-l-emerald-600 dark:border-l-emerald-400",
      badgeClass: "bg-emerald-600/15 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
    };
  }
  if (month >= 6 && month <= 8) {
    return {
      emoji: "☀️",
      borderClass: "border-l-amber-500 dark:border-l-amber-300",
      badgeClass: "bg-amber-500/15 text-amber-800 dark:bg-amber-300/15 dark:text-amber-200",
    };
  }
  if (month >= 9 && month <= 11) {
    return {
      emoji: "🍂",
      borderClass: "border-l-orange-600 dark:border-l-orange-400",
      badgeClass: "bg-orange-600/15 text-orange-800 dark:bg-orange-400/15 dark:text-orange-200",
    };
  }
  return {
    emoji: "❄️",
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

export const VisitAccordion = ({ visits, isEditable = false }: VisitAccordionProps) => {
  const t = useTranslations("park");
  const [openId, setOpenId] = useState<number | null>(() => {
    const sorted = [...visits].sort(
      (a, b) => new Date(b.visitedOn).getTime() - new Date(a.visitedOn).getTime(),
    );
    return sorted[0]?.id ?? null;
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
        const isOpen = openId === visit.id;
        const season = getSeasonPresentation(visit.visitedOn);
        const authorDetails = visit.author ? getVisitAuthorDetails(visit) : null;

        if (!isExpandable) {
          return (
            <div
              key={visit.id}
              className={`flex items-center justify-between ${VISIT_CARD_CLASS_NAME} ${season.borderClass} border-l-4 px-4 py-3`}
            >
              <span className="flex flex-wrap items-center gap-2.5 text-sm font-medium">
                <span
                  aria-hidden="true"
                  className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-sm leading-none ${season.badgeClass}`}
                >
                  {season.emoji}
                </span>
                <span className={VISIT_BADGE_CLASS_NAME}>
                  {t("visitNumber", { number })}
                </span>
                <span className="text-base">{formatFinnishDate(visit.visitedOn)}</span>
                {visit.route && (
                  <span className={ROUTE_BADGE_CLASS_NAME}>
                    <Route className="h-3.5 w-3.5" aria-hidden="true" />
                    {visit.route}
                  </span>
                )}
              </span>
              {isEditable && <EditVisitLink visitId={visit.id} />}
            </div>
          );
        }

        return (
          <div
            key={visit.id}
            className={`overflow-hidden ${VISIT_CARD_CLASS_NAME} ${season.borderClass} border-l-4`}
          >
            <button
              type="button"
              onClick={() => toggle(visit.id, isExpandable)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/36 dark:hover:bg-slate-950/26"
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
                <span className={VISIT_BADGE_CLASS_NAME}>
                  {t("visitNumber", { number })}
                </span>
                <span className="text-base">{formatFinnishDate(visit.visitedOn)}</span>
                {visit.route && (
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
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {isEditable && (
                  <EditVisitLink visitId={visit.id} onClick={(e) => e.stopPropagation()} />
                )}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden min-h-0">
                <div className="space-y-3 border-t border-white/35 bg-white/30 px-4 py-3 dark:border-white/10 dark:bg-slate-950/22">
                  {visit.note && (
                    <>
                      <h3 className={DETAIL_SECTION_HEADING_CLASS_NAME}>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {t("detailsTitle")}
                      </h3>
                      <div className="prose prose-sm text-foreground dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{visit.note}</ReactMarkdown>
                      </div>
                    </>
                  )}
                  {hasImages && visit.images && (
                    <>
                      <h3 className={DETAIL_SECTION_HEADING_CLASS_NAME}>
                        <Images className="h-4 w-4 text-muted-foreground" />
                        {t("imagesTitle")}
                      </h3>
                      <VisitImageGallery images={visit.images} centerThumbnailsWhenStatic />
                    </>
                  )}
                  {visit.author && authorDetails && (
                    <>
                      <h3 className={DETAIL_SECTION_HEADING_CLASS_NAME}>
                        <User className="h-4 w-4 text-muted-foreground" />
                        {t("authorTitle")}
                      </h3>
                      <p className="text-sm">
                        {visit.author}, {authorDetails.createdAt}
                        {authorDetails.showUpdatedAt ? (
                          <span>
                            {" "}
                            ({t("updatedAtLabel")} {authorDetails.updatedAt})
                          </span>
                        ) : null}
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
