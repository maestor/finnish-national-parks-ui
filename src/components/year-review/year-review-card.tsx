import { Sparkles } from "lucide-react";
import {
  PUBLIC_EYEBROW_BADGE_CLASS_NAME,
  PUBLIC_PANEL_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import type { YearReviewStats } from "@/lib/year-review";

interface YearReviewCardLabels {
  eyebrow: string;
  emptyYear: string;
  stats: {
    visits: string;
    parks: string;
    newParks: string;
    revisitedParks: string;
    images: string;
    activeMonths: string;
    mostVisited: string;
  };
  seasonsTitle: string;
  seasons: {
    spring: string;
    summer: string;
    autumn: string;
    winter: string;
  };
}

interface YearReviewCardProps {
  labels: YearReviewCardLabels;
  stats: YearReviewStats;
}

const buildYearReviewCardLabels = (t: (key: string) => string): YearReviewCardLabels => ({
  eyebrow: t("eyebrow"),
  emptyYear: t("emptyYear"),
  stats: {
    visits: t("stats.visits"),
    parks: t("stats.parks"),
    newParks: t("stats.newParks"),
    revisitedParks: t("stats.revisitedParks"),
    images: t("stats.images"),
    activeMonths: t("stats.activeMonths"),
    mostVisited: t("stats.mostVisited"),
  },
  seasonsTitle: t("seasons.title"),
  seasons: {
    spring: t("seasons.spring"),
    summer: t("seasons.summer"),
    autumn: t("seasons.autumn"),
    winter: t("seasons.winter"),
  },
});

const STAT_ITEM_CLASS_NAME =
  "flex flex-col rounded-2xl border border-sky-200/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(237,245,249,0.92))] px-4 py-3 shadow-[0_14px_28px_rgba(148,163,184,0.12),inset_0_1px_0_rgba(255,255,255,0.58)] dark:border-white/8 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.72),rgba(2,6,23,0.52))] dark:shadow-[0_18px_34px_rgba(2,6,23,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]";

const YearReviewCard = ({ stats, labels }: YearReviewCardProps) => {
  const statItems = [
    { label: labels.stats.visits, value: stats.visitCount },
    { label: labels.stats.parks, value: stats.distinctParkCount },
    { label: labels.stats.newParks, value: stats.newParkCount },
    { label: labels.stats.revisitedParks, value: stats.revisitedParkCount },
    { label: labels.stats.images, value: stats.imageCount },
    { label: labels.stats.activeMonths, value: stats.activeMonthCount },
  ];

  const seasonItems = [
    { label: labels.seasons.spring, value: stats.seasonalVisits.spring },
    { label: labels.seasons.summer, value: stats.seasonalVisits.summer },
    { label: labels.seasons.autumn, value: stats.seasonalVisits.autumn },
    { label: labels.seasons.winter, value: stats.seasonalVisits.winter },
  ];

  return (
    <section className={PUBLIC_PANEL_CLASS_NAME} aria-labelledby="year-review-heading">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={PUBLIC_EYEBROW_BADGE_CLASS_NAME}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>{labels.eyebrow}</span>
        </div>
        <h2 id="year-review-heading" className="text-5xl font-extrabold tracking-tight">
          {stats.year}
        </h2>
      </div>

      {stats.visitCount === 0 ? (
        <p className="mt-6 text-center text-muted-foreground">{labels.emptyYear}</p>
      ) : (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {statItems.map((item) => (
              <div key={item.label} className={STAT_ITEM_CLASS_NAME}>
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="mt-2 text-2xl font-bold tracking-tight">{item.value}</dd>
              </div>
            ))}
          </dl>

          {stats.mostVisitedPark ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{labels.stats.mostVisited}</span>
              {`: ${stats.mostVisitedPark.name} (${stats.mostVisitedPark.visitCount})`}
            </p>
          ) : null}

          <div className="mt-8">
            <h3 className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {labels.seasonsTitle}
            </h3>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {seasonItems.map((item) => (
                <div key={item.label} className={STAT_ITEM_CLASS_NAME}>
                  <dt className="text-xs text-muted-foreground">{item.label}</dt>
                  <dd className="mt-2 text-xl font-bold tracking-tight">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      )}
    </section>
  );
};

export { buildYearReviewCardLabels, YearReviewCard };
