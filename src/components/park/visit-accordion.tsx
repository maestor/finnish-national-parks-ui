"use client";

import { EditVisitLink } from "@/components/visits/edit-visit-link";
import { ChevronDown, FileText, Route, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Visit {
  id: number;
  visitedOn: string;
  route: string | null;
  author: string | null;
  note: string | null;
}

interface VisitAccordionProps {
  visits: Visit[];
  isEditable?: boolean;
}

const getSeasonBorderClass = (dateStr: string): string => {
  const month = new Date(dateStr).getMonth() + 1;
  if (month >= 3 && month <= 5) return "border-l-emerald-500";
  if (month >= 6 && month <= 8) return "border-l-amber-500";
  if (month >= 9 && month <= 11) return "border-l-orange-500";
  return "border-l-sky-500";
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

  const toggle = (id: number, hasNotes: boolean) => {
    if (!hasNotes) return;
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <div className="space-y-3">
      {displayVisits.map((visit) => {
        const number = visitNumbers.get(visit.id) ?? 0;
        const hasDetails = !!visit.note || !!visit.route || !!visit.author;
        const isOpen = openId === visit.id;
        const seasonBorder = getSeasonBorderClass(visit.visitedOn);

        if (!hasDetails) {
          return (
            <div
              key={visit.id}
              className={`flex items-center justify-between rounded-lg border bg-card shadow-sm ${seasonBorder} border-l-4 px-4 py-3`}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {t("visitNumber", { number })}
                </span>
                {formatDate(visit.visitedOn)}
              </span>
              {isEditable && <EditVisitLink visitId={visit.id} />}
            </div>
          );
        }

        return (
          <div
            key={visit.id}
            className={`overflow-hidden rounded-lg border bg-card shadow-sm ${seasonBorder} border-l-4`}
          >
            <button
              type="button"
              onClick={() => toggle(visit.id, hasDetails)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={isOpen}
              title={isOpen ? t("hideDetails") : t("showDetails")}
              aria-label={isOpen ? t("hideDetails") : t("showDetails")}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {t("visitNumber", { number })}
                </span>
                <span className="text-sm font-medium">{formatDate(visit.visitedOn)}</span>
                {visit.route && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white dark:bg-emerald-500/15 dark:text-emerald-400">
                    <Route className="h-3 w-3" />
                    {visit.route}
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
