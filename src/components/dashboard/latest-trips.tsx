import { Route } from "lucide-react";
import Link from "next/link";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { BackToStartLink } from "@/components/home/back-to-start-link";
import { formatOptionalFinnishDate } from "@/lib/fi-date";
import type { HomeLatestTripItem } from "@/lib/frontend-summaries";
import { appRoutes } from "@/lib/routes";

interface LatestTripsProps {
  title: string;
  emptyMessage: string;
  trips: HomeLatestTripItem[];
  backToStartLabel: string;
}

export const LatestTrips = ({ title, emptyMessage, trips, backToStartLabel }: LatestTripsProps) => {
  return (
    <DashboardSectionCard
      title={title}
      titleId="latest-trips-title"
      icon={Route}
      iconClassName="text-violet-700 dark:text-violet-300"
      iconSurfaceClassName="bg-violet-500/12 dark:bg-violet-400/10"
      className="h-full"
      footer={<BackToStartLink label={backToStartLabel} />}
    >
      {trips.length === 0 ? (
        <p className="rounded-[1.45rem] border border-dashed border-white/45 bg-white/48 px-4 py-8 text-sm text-muted-foreground backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/42">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-3">
          {trips.map((trip) => (
            <li
              key={trip.tripSlug}
              className="flex flex-col items-start justify-between gap-3 rounded-[1.45rem] border border-white/45 bg-white/62 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-sm transition-colors hover:bg-white/78 sm:flex-row sm:items-center dark:border-white/10 dark:bg-slate-950/48 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:bg-slate-950/62"
            >
              <Link
                href={appRoutes.trip(trip.tripSlug)}
                title={trip.tripName}
                className="min-w-0 text-sm font-medium hover:underline sm:truncate sm:text-base"
              >
                {trip.tripName}
              </Link>
              <span className="rounded-full border border-white/45 bg-white/70 px-3 py-1 text-xs font-medium text-foreground/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm sm:shrink-0 sm:text-sm dark:border-white/10 dark:bg-slate-950/56 dark:text-sky-100/74 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                {formatOptionalFinnishDate(trip.startDate)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardSectionCard>
  );
};
