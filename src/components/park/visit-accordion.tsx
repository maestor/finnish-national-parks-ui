"use client";

import { EditVisitLink } from "@/components/visits/edit-visit-link";
import { VisitImageGallery } from "@/components/visits/visit-image-gallery";
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fi-FI");
  };

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

        if (!isExpandable) {
          return (
            <div
              key={visit.id}
              className={`flex items-center justify-between rounded-lg border bg-card shadow-sm ${season.borderClass} border-l-4 px-4 py-3`}
            >
              <span className="flex flex-wrap items-center gap-2.5 text-sm font-medium sm:text-base">
                <span
                  aria-hidden="true"
                  className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-sm leading-none sm:text-base ${season.badgeClass}`}
                >
                  {season.emoji}
                </span>
                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-1 text-sm leading-none font-bold text-primary sm:text-base">
                  {t("visitNumber", { number })}
                </span>
                <span className="text-base sm:text-lg">{formatDate(visit.visitedOn)}</span>
                {visit.route && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-2.5 py-1 text-sm leading-none font-semibold text-white dark:bg-emerald-500/15 dark:text-emerald-400 sm:text-base">
                    <Route className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
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
            className={`overflow-hidden rounded-lg border bg-card shadow-sm ${season.borderClass} border-l-4`}
          >
            <button
              type="button"
              onClick={() => toggle(visit.id, isExpandable)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={isOpen}
              title={isOpen ? t("hideDetails") : t("showDetails")}
              aria-label={isOpen ? t("hideDetails") : t("showDetails")}
            >
              <span className="flex flex-wrap items-center gap-2.5 text-sm font-medium sm:text-base">
                <span
                  aria-hidden="true"
                  className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-sm leading-none sm:text-base ${season.badgeClass}`}
                >
                  {season.emoji}
                </span>
                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2.5 py-1 text-sm leading-none font-bold text-primary sm:text-base">
                  {t("visitNumber", { number })}
                </span>
                <span className="text-base sm:text-lg">{formatDate(visit.visitedOn)}</span>
                {visit.route && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-2.5 py-1 text-sm leading-none font-semibold text-white dark:bg-emerald-500/15 dark:text-emerald-400 sm:text-base">
                    <Route className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                    {visit.route}
                  </span>
                )}
                {hasImages && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-sm leading-none font-semibold text-primary sm:text-base">
                    <Images className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
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
                <div className="border-t px-4 py-3 space-y-3">
                  {visit.note && (
                    <>
                      <h3 className="flex items-center gap-2 text-base font-semibold border-b pb-2">
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
                      <h3 className="flex items-center gap-2 text-base font-semibold border-b pb-2">
                        <Images className="h-4 w-4 text-muted-foreground" />
                        {t("imagesTitle")}
                      </h3>
                      <VisitImageGallery images={visit.images} centerThumbnailsWhenStatic />
                    </>
                  )}
                  {visit.author && (
                    <>
                      <h3 className="flex items-center gap-2 text-base font-semibold border-b pb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {t("authorTitle")}
                      </h3>
                      <p className="text-sm">{visit.author}</p>
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
