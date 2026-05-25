import { BarChart3 } from "lucide-react";
import Link from "next/link";

interface ProgressItem {
  label: string;
  visited: number;
  total: number;
  mapFilter?: string;
}

interface HomeVisitStatsProps {
  sectionTitle: string;
  totalVisitsLabel: string;
  totalVisits: number;
  progressItems: ProgressItem[];
}

export const HomeVisitStats = ({
  sectionTitle,
  totalVisitsLabel,
  totalVisits,
  progressItems,
}: HomeVisitStatsProps) => {
  if (progressItems.length === 0) {
    return null;
  }

  return (
    <section className="mt-4" aria-labelledby="home-visit-stats-title">
      <div className="rounded-[2rem] border border-white/55 bg-white/66 p-6 text-card-foreground shadow-[0_24px_60px_rgba(148,163,184,0.18)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/58 dark:border-white/10 dark:bg-slate-950/52 dark:shadow-[0_28px_64px_rgba(2,6,23,0.34)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-white/50 bg-white/72 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <h2 id="home-visit-stats-title" className="text-xl font-semibold tracking-tight">
              {sectionTitle}
            </h2>
          </div>
          <div className="w-full rounded-[1.6rem] border border-white/55 bg-[linear-gradient(118deg,rgba(22,101,52,0.16)_0%,rgba(15,118,110,0.12)_46%,rgba(37,99,235,0.18)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-sm md:max-w-xs dark:border-white/10 dark:bg-[linear-gradient(118deg,rgba(22,101,52,0.24)_0%,rgba(15,118,110,0.2)_46%,rgba(37,99,235,0.26)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <p className="text-sm text-foreground/70 dark:text-sky-100/78">{totalVisitsLabel}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{totalVisits}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {progressItems.map((item) => {
            const percentage = item.total > 0 ? Math.round((item.visited / item.total) * 100) : 0;
            const itemContent = (
              <>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-foreground/68 dark:text-sky-100/72">
                    {item.visited} / {item.total}
                  </span>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-emerald-950/8 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,rgb(22,101,52)_0%,rgb(15,118,110)_52%,rgb(37,99,235)_100%)] transition-all motion-reduce:transition-none"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </>
            );

            const itemClassName =
              "block rounded-[1.45rem] border border-white/45 bg-white/62 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/48 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

            if (!item.mapFilter) {
              return (
                <div key={item.label} className={itemClassName}>
                  {itemContent}
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={`/parks?filter=${item.mapFilter}`}
                className={`${itemClassName} transition-[transform,border-color,box-shadow] hover:-translate-y-px hover:border-sky-300/80 hover:shadow-[0_14px_28px_rgba(148,163,184,0.16),inset_0_1px_0_rgba(255,255,255,0.58)] dark:hover:border-sky-300/24 dark:hover:shadow-[0_18px_34px_rgba(2,6,23,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]`}
              >
                {itemContent}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
