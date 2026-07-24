"use client";

import { NotebookPen } from "lucide-react";
import Link from "next/link";
import { VisitAccordion } from "@/components/park/visit-accordion";
import { useAuth } from "@/hooks/use-auth";
import type { Visit } from "@/lib/parks";
import { appRoutes, createPathWithSearchParams } from "@/lib/routes";

interface ParkVisitHistoryProps {
  addVisitLabel: string;
  initialOpenVisitId?: number | null;
  noVisitsLabel: string;
  parkSlug: string;
  title: string;
  visits: Visit[];
}

export const ParkVisitHistory = ({
  addVisitLabel,
  initialOpenVisitId = null,
  noVisitsLabel,
  parkSlug,
  title,
  visits,
}: ParkVisitHistoryProps) => {
  const auth = useAuth();

  return (
    <section
      id="visit-history"
      className="mt-8 scroll-mt-24 rounded-[2rem] border border-white/45 bg-white/60 p-5 shadow-[0_24px_48px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/42 dark:shadow-[0_28px_56px_rgba(2,6,23,0.3)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        {!!auth.isAuthenticated && (
          <Link
            href={createPathWithSearchParams(appRoutes.controlPanel.newVisit, {
              park: parkSlug,
            })}
            className="inline-flex items-center gap-1 rounded-full bg-[linear-gradient(145deg,#166534_0%,#0f766e_55%,#2563eb_100%)] px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.24)] transition-[filter,transform] hover:brightness-105"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            {addVisitLabel}
          </Link>
        )}
      </div>

      {visits.length > 0 ? (
        <div className="mt-4">
          <VisitAccordion
            visits={visits}
            parkSlug={parkSlug}
            isEditable={auth.isAuthenticated}
            initialOpenVisitId={initialOpenVisitId}
          />
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-white/35 bg-white/46 px-4 py-4 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] dark:border-white/8 dark:bg-slate-950/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {noVisitsLabel}
        </p>
      )}
    </section>
  );
};
