import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
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
        <p className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ol className="space-y-3">
          {parks.map((park, index) => (
            <li
              key={park.parkSlug}
              className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border/70 bg-background/90 px-4 py-3 shadow-sm transition-colors hover:bg-background sm:flex-row sm:items-center dark:bg-background/70"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted text-sm font-semibold text-foreground">
                  {index + 1}
                </span>
                <Link
                  href={`/park/${park.parkSlug}`}
                  className="truncate text-sm font-medium hover:underline sm:text-base"
                >
                  {park.parkName}
                </Link>
              </div>
              <span className="rounded-full border border-border/70 bg-muted/80 px-3 py-1 text-xs font-medium text-muted-foreground sm:shrink-0 sm:text-sm">
                {`${park.visitCount} ${visitCountLabel}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </DashboardSectionCard>
  );
};
