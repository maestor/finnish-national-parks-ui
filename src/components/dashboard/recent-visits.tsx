import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { EditVisitLink } from "@/components/visits/edit-visit-link";
import { Footprints } from "lucide-react";
import Link from "next/link";

interface RecentVisit {
  id: number;
  parkName: string;
  parkSlug: string;
  visitedOn: string;
}

interface RecentVisitsProps {
  title: string;
  emptyMessage: string;
  visits: RecentVisit[];
  showEditLinks?: boolean;
}

export const RecentVisits = ({
  title,
  emptyMessage,
  visits,
  showEditLinks = false,
}: RecentVisitsProps) => {
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("fi-FI");

  return (
    <DashboardSectionCard
      title={title}
      titleId="recent-visits-title"
      icon={Footprints}
      iconClassName="text-emerald-700 dark:text-emerald-300"
      iconSurfaceClassName="bg-emerald-500/12 dark:bg-emerald-400/10"
      className="h-full"
    >
      {visits.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-3">
          {visits.map((visit) => (
            <li
              key={visit.id}
              className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/90 px-4 py-3 shadow-sm transition-colors hover:bg-background sm:flex-row sm:items-center dark:bg-background/70"
            >
              <Link
                href={`/park/${visit.parkSlug}`}
                className="min-w-0 text-sm font-medium hover:underline sm:truncate sm:text-base"
              >
                {visit.parkName}
              </Link>
              <div className="flex items-center gap-2 sm:shrink-0">
                <span className="rounded-full border border-border/70 bg-muted/80 px-3 py-1 text-xs font-medium text-muted-foreground sm:text-sm">
                  {formatDate(visit.visitedOn)}
                </span>
                {showEditLinks ? (
                  <EditVisitLink
                    visitId={visit.id}
                    className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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
