import { BarChart3 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BackToStartLink } from "@/components/home/back-to-start-link";
import {
  PUBLIC_CONTENT_PANEL_CLASS_NAME,
  PUBLIC_PANEL_ICON_SURFACE_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import type { HomeProgressItem } from "@/lib/frontend-summaries";

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
  progressItems: HomeProgressItem[];
  backToStartLabel: string;
  featuredMemories: ReactNode;
  seasonalVisitsLabel: string;
  seasonalVisits: SeasonalVisitCounts;
  springLabel: string;
  summerLabel: string;
  autumnLabel: string;
  winterLabel: string;
}

const CARD_CLASS_NAME =
  "w-full rounded-[1.4rem] border border-white/55 px-2.5 py-3 md:px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-sm dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

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
  featuredMemories,
}: HomeVisitStatsProps) => {
  const seasonItems = [
    {
      key: "spring",
      emoji: "🌱",
      label: springLabel,
      count: seasonalVisits.spring,
      badgeClass: "bg-emerald-600/15 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
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
  ];

  return (
    <section aria-labelledby="home-visit-stats-title">
      <div className={`${PUBLIC_CONTENT_PANEL_CLASS_NAME} text-card-foreground`}>
        <div className="grid grid-cols-[minmax(0,.85fr)_minmax(0,1.35fr)] items-center gap-x-2.5 gap-y-4 md:grid-cols-[minmax(0,1fr)_150px_252px] md:gap-3">
          <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1 md:self-start">
            <span className={PUBLIC_PANEL_ICON_SURFACE_CLASS_NAME}>
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <h2 id="home-visit-stats-title" className="text-xl font-semibold tracking-tight">
              {sectionTitle}
            </h2>
          </div>

          <div className={`${TOTAL_VISITS_CARD_CLASS_NAME} h-24.5 min-w-0 md:h-24`}>
            <p className="text-xs text-foreground/70 dark:text-sky-100/78">{totalVisitsLabel}</p>
            <p className="mt-1 text-[2rem] font-semibold tracking-tight">{totalVisits}</p>
          </div>
          <div className={`${SEASONAL_CARD_CLASS_NAME} h-24.5 min-w-0 md:h-24`}>
            <p className="text-xs text-foreground/70 dark:text-sky-100/78">{seasonalVisitsLabel}</p>
            <div className="mt-1.5 grid grid-cols-4 gap-0.75 md:gap-1.25">
              {seasonItems.map((season) => (
                <div
                  key={season.key}
                  className="flex flex-col items-center gap-0.5 rounded-xl border border-white/40 bg-white/50 px-px py-0.75 md:px-1 dark:border-white/8 dark:bg-slate-950/30"
                >
                  <span
                    role="img"
                    aria-label={season.label}
                    title={season.label}
                    className={`inline-flex items-center justify-center rounded-full px-1 py-px text-[13px] leading-none ${season.badgeClass}`}
                  >
                    {season.emoji}
                  </span>
                  <span className="text-base font-semibold tracking-tight">{season.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {featuredMemories}

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

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`${itemClassName} transition-[transform,border-color,box-shadow] hover:-translate-y-px hover:border-sky-300/80 hover:shadow-[0_14px_28px_rgba(148,163,184,0.16),inset_0_1px_0_rgba(255,255,255,0.58)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:hover:border-sky-300/24 dark:hover:shadow-[0_18px_34px_rgba(2,6,23,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]`}
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
