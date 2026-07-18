import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { appRoutes } from "@/lib/routes";
import { Trophy } from "lucide-react";
import Link from "next/link";

interface MostVisitedPark {
  parkName: string;
  parkSlug: string;
  visitCount: number;
}

interface MostVisitedParksProps {
  title: string;
  emptyMessage: string;
  visitCountLabel: string;
  parks: MostVisitedPark[];
}

export const MostVisitedParks = ({
  title,
  emptyMessage,
  visitCountLabel,
  parks,
}: MostVisitedParksProps) => {
  return (
    <DashboardSectionCard
      title={title}
      titleId="most-visited-parks-title"
      icon={Trophy}
      iconClassName="text-amber-700 dark:text-amber-300"
      iconSurfaceClassName="bg-amber-500/12 dark:bg-amber-400/10"
    >
      {parks.length === 0 ? (
        <p className="rounded-[1.45rem] border border-dashed border-white/45 bg-white/48 px-4 py-8 text-sm text-muted-foreground backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/42">
          {emptyMessage}
        </p>
      ) : (
        <ol className="space-y-3">
          {parks.map((park, index) => (
            <li
              key={park.parkSlug}
              className="flex flex-col items-start justify-between gap-4 rounded-[1.45rem] border border-white/45 bg-white/62 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-sm transition-colors hover:bg-white/78 sm:flex-row sm:items-center dark:border-white/10 dark:bg-slate-950/48 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:bg-slate-950/62"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/50 bg-[linear-gradient(135deg,rgba(245,158,11,0.22),rgba(251,191,36,0.08))] text-sm font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(245,158,11,0.08))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  {index + 1}
                </span>
                <Link
                  href={appRoutes.park(park.parkSlug)}
                  className="min-w-0 whitespace-normal break-words text-sm font-medium leading-snug hover:underline sm:truncate sm:text-base sm:leading-normal"
                >
                  {park.parkName}
                </Link>
              </div>
              <span className="rounded-full border border-white/45 bg-white/70 px-3 py-1 text-xs font-medium text-foreground/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm sm:shrink-0 sm:text-sm dark:border-white/10 dark:bg-slate-950/56 dark:text-sky-100/74 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                {`${park.visitCount} ${visitCountLabel}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </DashboardSectionCard>
  );
};
