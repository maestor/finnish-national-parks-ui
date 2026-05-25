import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { EditVisitLink } from "@/components/visits/edit-visit-link";
import { formatFinnishDate } from "@/lib/fi-date";
import { NotebookPen } from "lucide-react";
import Link from "next/link";

interface LatestVisitEntry {
  id?: number;
  parkName: string;
  parkSlug: string;
  createdAt: string;
}

interface LatestVisitEntriesProps {
  title: string;
  emptyMessage: string;
  visits: LatestVisitEntry[];
  showEditLinks?: boolean;
}

export const LatestVisitEntries = ({
  title,
  emptyMessage,
  visits,
  showEditLinks = false,
}: LatestVisitEntriesProps) => {
  const getVisitKey = (visit: LatestVisitEntry) =>
    visit.id ?? `${visit.parkSlug}:${visit.createdAt}`;

  return (
    <DashboardSectionCard
      title={title}
      titleId="latest-visit-entries-title"
      icon={NotebookPen}
      iconClassName="text-sky-700 dark:text-sky-300"
      iconSurfaceClassName="bg-sky-500/12 dark:bg-sky-400/10"
      className="h-full"
    >
      {visits.length === 0 ? (
        <p className="rounded-[1.45rem] border border-dashed border-white/45 bg-white/48 px-4 py-8 text-sm text-muted-foreground backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/42">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-3">
          {visits.map((visit) => (
            <li
              key={getVisitKey(visit)}
              className="flex flex-col items-start justify-between gap-3 rounded-[1.45rem] border border-white/45 bg-white/62 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-sm transition-colors hover:bg-white/78 sm:flex-row sm:items-center dark:border-white/10 dark:bg-slate-950/48 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:bg-slate-950/62"
            >
              <Link
                href={`/park/${visit.parkSlug}`}
                className="min-w-0 text-sm font-medium hover:underline sm:truncate sm:text-base"
              >
                {visit.parkName}
              </Link>
              <div className="flex items-center gap-2 sm:shrink-0">
                <span className="rounded-full border border-white/45 bg-white/70 px-3 py-1 text-xs font-medium text-foreground/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm sm:text-sm dark:border-white/10 dark:bg-slate-950/56 dark:text-sky-100/74 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  {formatFinnishDate(visit.createdAt)}
                </span>
                {showEditLinks && visit.id !== undefined ? (
                  <EditVisitLink
                    visitId={visit.id}
                    className="inline-flex items-center justify-center rounded-full border border-white/45 bg-white/76 p-2 text-foreground/72 shadow-[0_8px_20px_rgba(148,163,184,0.18)] backdrop-blur-sm transition-colors hover:bg-white/92 hover:text-foreground dark:border-white/10 dark:bg-slate-950/56 dark:text-sky-100/72 dark:shadow-[0_12px_24px_rgba(2,6,23,0.24)] dark:hover:bg-slate-950/72"
                    iconClassName="h-3.5 w-3.5"
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardSectionCard>
  );
};
