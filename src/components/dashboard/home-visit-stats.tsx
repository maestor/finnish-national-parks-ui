import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { BackToStartLink } from "@/components/home/back-to-start-link";
import {
  PUBLIC_PANEL_CLASS_NAME,
  PUBLIC_PANEL_ICON_SURFACE_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { appRoutes } from "@/lib/routes";

interface ProgressItem {
  label: string;
  visited: number;
  total: number;
  mapFilter?: string;
  mapVisitStatus?: "visited" | "not-visited";
}

interface SeasonalVisitCounts {
  spring: number;
  summer: number;
  autumn: number;
  winter: number;
}

interface HomeVisitStatsProps {
  sectionTitle: string;
  totalVisitsLabel: string;
  totalVisits: number;
  progressItems: ProgressItem[];
  backToStartLabel: string;
  seasonalVisitsLabel?: string;
  seasonalVisits?: SeasonalVisitCounts;
  springLabel?: string;
  summerLabel?: string;
  autumnLabel?: string;
  winterLabel?: string;
}

const CARD_CLASS_NAME =
  "w-full rounded-[1.6rem] border border-white/55 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-sm dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

const TOTAL_VISITS_CARD_CLASS_NAME = `${CARD_CLASS_NAME} bg-[linear-gradient(118deg,rgba(22,101,52,0.16)_0%,rgba(15,118,110,0.12)_46%,rgba(37,99,235,0.18)_100%)] dark:bg-[linear-gradient(118deg,rgba(22,101,52,0.24)_0%,rgba(15,118,110,0.2)_46%,rgba(37,99,235,0.26)_100%)]`;

const SEASONAL_CARD_CLASS_NAME = `${CARD_CLASS_NAME} bg-[linear-gradient(118deg,rgba(22,101,52,0.10)_0%,rgba(15,118,110,0.08)_46%,rgba(37,99,235,0.12)_100%)] dark:bg-[linear-gradient(118deg,rgba(22,101,52,0.18)_0%,rgba(15,118,110,0.14)_46%,rgba(37,99,235,0.20)_100%)]`;

export const HomeVisitStats = ({
  sectionTitle,
  totalVisitsLabel,
  totalVisits,
  progressItems,
  backToStartLabel,
  seasonalVisitsLabel,
  seasonalVisits,
  springLabel,
  summerLabel,
  autumnLabel,
  winterLabel,
}: HomeVisitStatsProps) => {
  if (progressItems.length === 0) {
    return null;
  }

  const getMapHref = (item: ProgressItem) => {
    const searchParams = new URLSearchParams();

    if (item.mapFilter) {
      searchParams.set("filter", item.mapFilter);
    }

    if (item.mapVisitStatus) {
      searchParams.set("visitStatus", item.mapVisitStatus);
    }

    const search = searchParams.toString();

    return search ? `${appRoutes.parks}?${search}` : appRoutes.parks;
  };

  const hasSeasonalData =
    seasonalVisits !== undefined &&
    seasonalVisitsLabel !== undefined &&
    springLabel !== undefined &&
    summerLabel !== undefined &&
    autumnLabel !== undefined &&
    winterLabel !== undefined;

  const seasonItems = hasSeasonalData
    ? [
        {
          key: "spring",
          emoji: "🌱",
          label: springLabel,
          count: seasonalVisits.spring,
          badgeClass:
            "bg-emerald-600/15 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
        },
        {
          key: "summer",
          emoji: "☀️",
          label: summerLabel,
          count: seasonalVisits.summer,
          badgeClass: "bg-amber-500/15 text-amber-800 dark:bg-amber-300/15 dark:text-amber-200",
        },
        {
          key: "autumn",
          emoji: "🍂",
          label: autumnLabel,
          count: seasonalVisits.autumn,
          badgeClass: "bg-orange-600/15 text-orange-800 dark:bg-orange-400/15 dark:text-orange-200",
        },
        {
          key: "winter",
          emoji: "❄️",
          label: winterLabel,
          count: seasonalVisits.winter,
          badgeClass: "bg-sky-600/15 text-sky-800 dark:bg-cyan-400/15 dark:text-cyan-200",
        },
      ]
    : [];

  return (
    <section aria-labelledby="home-visit-stats-title">
      <div className={`${PUBLIC_PANEL_CLASS_NAME} text-card-foreground`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <span className={PUBLIC_PANEL_ICON_SURFACE_CLASS_NAME}>
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <h2 id="home-visit-stats-title" className="text-xl font-semibold tracking-tight">
              {sectionTitle}
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {hasSeasonalData ? (
              <div className="flex flex-col gap-3 md:flex-row md:max-w-lg">
                <div className={`${TOTAL_VISITS_CARD_CLASS_NAME} flex-1`}>
                  <p className="text-sm text-foreground/70 dark:text-sky-100/78">
                    {totalVisitsLabel}
                  </p>
                  <p className="mt-1 text-4xl font-semibold tracking-tight">{totalVisits}</p>
                </div>
                <div className={`${SEASONAL_CARD_CLASS_NAME} flex-1`}>
                  <p className="text-sm text-foreground/70 dark:text-sky-100/78">
                    {seasonalVisitsLabel}
                  </p>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {seasonItems.map((season) => (
                      <div
                        key={season.key}
                        className="flex flex-col items-center gap-1 rounded-xl border border-white/40 bg-white/50 px-2 py-1.5 dark:border-white/8 dark:bg-slate-950/30"
                      >
                        <span
                          role="img"
                          aria-label={season.label}
                          title={season.label}
                          className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-sm leading-none ${season.badgeClass}`}
                        >
                          {season.emoji}
                        </span>
                        <span className="text-lg font-semibold tracking-tight">{season.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`${TOTAL_VISITS_CARD_CLASS_NAME} md:max-w-xs`}>
                <p className="text-sm text-foreground/70 dark:text-sky-100/78">
                  {totalVisitsLabel}
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">{totalVisits}</p>
              </div>
            )}
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

            if (!item.mapFilter && !item.mapVisitStatus) {
              return (
                <div key={item.label} className={itemClassName}>
                  {itemContent}
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={getMapHref(item)}
                className={`${itemClassName} transition-[transform,border-color,box-shadow] hover:-translate-y-px hover:border-sky-300/80 hover:shadow-[0_14px_28px_rgba(148,163,184,0.16),inset_0_1px_0_rgba(255,255,255,0.58)] dark:hover:border-sky-300/24 dark:hover:shadow-[0_18px_34px_rgba(2,6,23,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]`}
              >
                {itemContent}
              </Link>
            );
          })}
        </div>

        <div className="mt-5">
          <BackToStartLink label={backToStartLabel} />
        </div>
      </div>
    </section>
  );
};
