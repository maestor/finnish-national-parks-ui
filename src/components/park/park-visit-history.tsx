"use client";

import { VisitAccordion } from "@/components/park/visit-accordion";
import { useAuth } from "@/hooks/use-auth";
import type { Visit } from "@/lib/parks";
import { NotebookPen } from "lucide-react";
import Link from "next/link";

interface ParkVisitHistoryProps {
  addVisitLabel: string;
  noVisitsLabel: string;
  parkSlug: string;
  title: string;
  visits: Visit[];
}

export const ParkVisitHistory = ({
  addVisitLabel,
  noVisitsLabel,
  parkSlug,
  title,
  visits,
}: ParkVisitHistoryProps) => {
  const auth = useAuth();

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        {auth.isAuthenticated ? (
          <Link
            href={`/control-panel/visits/new?park=${parkSlug}`}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
        ) : null}
      </div>

      {visits.length > 0 ? (
        <div className="mt-4">
          <VisitAccordion visits={visits} isEditable={auth.isAuthenticated} />
        </div>
      ) : (
        <p className="mt-4 text-muted-foreground">{noVisitsLabel}</p>
      )}
    </div>
  );
};
