"use client";

import { NotebookPen } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { VisitAccordion } from "@/components/park/visit-accordion";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import type { AdminParkVisits, Visit } from "@/lib/parks";
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
  const [visibleVisits, setVisibleVisits] = useState<Visit[]>(visits);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setVisibleVisits(visits);
      return;
    }

    let isCurrent = true;

    void apiFetch<AdminParkVisits>(`/api/admin/parks/${encodeURIComponent(parkSlug)}/visits`, {
      cache: "no-store",
    })
      .then((response) => {
        if (isCurrent) {
          setVisibleVisits(response.visits);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setVisibleVisits(visits);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [auth.isAuthenticated, parkSlug, visits]);

  return (
    <section
      id="visit-history"
      className="mt-8 scroll-mt-28 rounded-[2rem] border border-border bg-control p-5 shadow-[0_24px_48px_rgba(var(--shadow-rgb),0.14)] backdrop-blur-xl dark:shadow-[0_28px_56px_rgba(var(--shadow-rgb),0.3)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-link" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        {!!auth.isAuthenticated && (
          <Link
            href={createPathWithSearchParams(appRoutes.controlPanel.newVisit, {
              park: parkSlug,
            })}
            className="inline-flex items-center gap-1 rounded-full theme-action px-3 py-1.5 text-xs font-medium text-action-foreground shadow-[0_14px_28px_rgba(var(--shadow-rgb),0.24)] transition-[filter,transform] hover:brightness-105"
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

      {visibleVisits.length > 0 ? (
        <div className="mt-4">
          <VisitAccordion
            visits={visibleVisits}
            parkSlug={parkSlug}
            isEditable={auth.isAuthenticated}
            initialOpenVisitId={initialOpenVisitId}
          />
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-border bg-control px-4 py-4 text-muted-foreground shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.42)] dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]">
          {noVisitsLabel}
        </p>
      )}
    </section>
  );
};
