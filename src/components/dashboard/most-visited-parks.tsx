import { Trophy } from "lucide-react";
import Link from "next/link";
import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { BackToStartLink } from "@/components/home/back-to-start-link";
import { appRoutes } from "@/lib/routes";

interface MostVisitedPark {
  parkName: string;
  parkSlug: string;
  visitCount: number;
}

interface MostVisitedParksProps {
  title: string;
  emptyMessage: string;
  visitCountLabel: string;
  backToStartLabel: string;
  parks: MostVisitedPark[];
}

export const MostVisitedParks = ({
  title,
  emptyMessage,
  visitCountLabel,
  backToStartLabel,
  parks,
}: MostVisitedParksProps) => {
  return (
    <DashboardSectionCard
      title={title}
      titleId="most-visited-parks-title"
      icon={Trophy}
      iconClassName="text-amber-700 dark:text-amber-300"
      iconSurfaceClassName="bg-amber-500/12 dark:bg-amber-400/10"
      className="h-full"
      footer={<BackToStartLink label={backToStartLabel} />}
    >
      {parks.length === 0 ? (
        <p className="rounded-[1.45rem] border border-dashed border-white/45 bg-white/48 px-4 py-8 text-sm text-muted-foreground backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/42">
          {emptyMessage}
        </p>
      ) : (
        <ol className="space-y-3">
          {parks.map((park) => (
            <li
              key={park.parkSlug}
              className="flex flex-col items-start justify-between gap-4 rounded-[1.45rem] border border-white/45 bg-white/62 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-sm transition-colors hover:bg-white/78 sm:flex-row sm:items-center dark:border-white/10 dark:bg-slate-950/48 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:bg-slate-950/62"
            >
              <Link
                href={appRoutes.park(park.parkSlug)}
                className="min-w-0 flex-1 whitespace-normal break-words text-sm font-medium leading-snug hover:underline sm:text-base sm:leading-normal"
              >
                {park.parkName}
              </Link>
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
