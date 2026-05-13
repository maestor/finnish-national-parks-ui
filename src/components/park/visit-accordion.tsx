"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Visit {
  id: number;
  visitedOn: string;
  note: string | null;
}

interface VisitAccordionProps {
  visits: Visit[];
}

export const VisitAccordion = ({ visits }: VisitAccordionProps) => {
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
    <div className="space-y-2">
      {displayVisits.map((visit) => {
        const number = visitNumbers.get(visit.id) ?? 0;
        const hasNotes = !!visit.note;
        const isOpen = openId === visit.id;
        const dateLabel = `${formatDate(visit.visitedOn)} — ${t("visitNumber", { number })}`;

        if (!hasNotes) {
          return (
            <div
              key={visit.id}
              className="flex items-center justify-between rounded-lg border bg-gradient-to-r from-muted/30 to-transparent px-4 py-3"
            >
              <span className="text-sm font-medium">{dateLabel}</span>
              <span className="text-sm text-muted-foreground">{t("noDetails")}</span>
            </div>
          );
        }

        return (
          <div
            key={visit.id}
            className="overflow-hidden rounded-lg border bg-gradient-to-r from-muted/30 to-transparent"
          >
            <button
              type="button"
              onClick={() => toggle(visit.id, hasNotes)}
              className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-medium">{dateLabel}</span>
              <span className="flex items-center gap-1.5 text-sm text-primary">
                <span className="underline">{isOpen ? t("hideDetails") : t("showDetails")}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden min-h-0">
                <div className="border-t px-4 py-3">
                  <h3 className="text-base font-semibold border-b pb-2">{t("detailsTitle")}</h3>
                  <div className="prose prose-sm dark:prose-invert mt-2 max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{visit.note || "_"}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
