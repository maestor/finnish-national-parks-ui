interface ProgressItem {
  label: string;
  visited: number;
  total: number;
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
    <section className="mt-10" aria-labelledby="home-visit-stats-title">
      <div className="rounded-3xl border border-border/80 bg-muted/35 p-6 text-card-foreground shadow-sm dark:bg-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="home-visit-stats-title" className="text-xl font-semibold tracking-tight">
              {sectionTitle}
            </h2>
          </div>
          <div className="w-full rounded-2xl border bg-background px-4 py-3 md:max-w-xs dark:bg-background/80">
            <p className="text-sm text-muted-foreground">{totalVisitsLabel}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{totalVisits}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {progressItems.map((item) => {
            const percentage = item.total > 0 ? Math.round((item.visited / item.total) * 100) : 0;

            return (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">
                    {item.visited} / {item.total}
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all motion-reduce:transition-none"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
