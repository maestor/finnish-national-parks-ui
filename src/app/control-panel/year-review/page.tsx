import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import {
  buildYearReviewCardLabels,
  YearReviewCard,
} from "@/components/year-review/year-review-card";
import { cn } from "@/lib/cn";
import { buildPageMetadata } from "@/lib/page-metadata";
import { buildAvailableVisitYears, fetchVisitsTimeline } from "@/lib/public-visits";
import { appRoutes, createPathWithSearchParams } from "@/lib/routes";
import { buildYearReviewStats } from "@/lib/year-review";

export const dynamic = "force-dynamic";

interface ControlPanelYearReviewPageProps {
  searchParams: Promise<{
    year?: string | string[];
  }>;
}

const YEAR_LINK_CLASS_NAME =
  "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ACTIVE_YEAR_LINK_CLASS_NAME =
  "border-emerald-700/15 bg-[linear-gradient(145deg,#166534_0%,#0f766e_55%,#2563eb_100%)] text-primary-foreground";
const INACTIVE_YEAR_LINK_CLASS_NAME =
  "border-white/45 bg-white/70 text-foreground/80 hover:bg-white/88 dark:border-white/10 dark:bg-slate-950/52 dark:text-sky-100/78 dark:hover:bg-slate-950/72";

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel"),
    getTranslations("metadata"),
  ]);
  return buildPageMetadata(t("yearReview.title"), metadataT("title"));
};

const parseRequestedYear = (value?: string | string[]) => {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(normalized ?? "", 10);

  return Number.isInteger(parsed) ? parsed : null;
};

const ControlPanelYearReviewPage = async ({ searchParams }: ControlPanelYearReviewPageProps) => {
  const { year: yearParam } = await searchParams;
  const [t, controlPanelT] = await Promise.all([
    getTranslations("yearReview"),
    getTranslations("controlPanel"),
  ]);
  const { visits } = await fetchVisitsTimeline();
  const availableYears = buildAvailableVisitYears(visits);

  if (availableYears.length === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight">{controlPanelT("yearReview.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("noVisits")}</p>
      </div>
    );
  }

  const requestedYear = parseRequestedYear(yearParam);
  const latestYearWithVisits =
    availableYears.find((year) =>
      visits.some((visit) => visit.visitedOn.startsWith(String(year))),
    ) ?? availableYears[0];
  const selectedYear =
    requestedYear !== null && availableYears.includes(requestedYear)
      ? requestedYear
      : latestYearWithVisits;
  const stats = buildYearReviewStats(visits, selectedYear);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">{controlPanelT("yearReview.title")}</h1>
      <p className="mt-2 text-muted-foreground">{controlPanelT("yearReview.description")}</p>

      <nav aria-label={t("selectYear")} className="mt-4 flex flex-wrap gap-2">
        {availableYears.map((year) => (
          <Link
            key={year}
            href={createPathWithSearchParams(appRoutes.controlPanel.yearReview, { year })}
            aria-current={selectedYear === year ? "page" : undefined}
            className={cn(
              YEAR_LINK_CLASS_NAME,
              selectedYear === year ? ACTIVE_YEAR_LINK_CLASS_NAME : INACTIVE_YEAR_LINK_CLASS_NAME,
            )}
          >
            {year}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        <YearReviewCard stats={stats} labels={buildYearReviewCardLabels(t)} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <CopyLinkButton
          href={appRoutes.yearReview(selectedYear)}
          label={t("copyShareLink")}
          copiedLabel={t("shareLinkCopied")}
          tooltipSide="top"
          className="inline-flex items-center justify-center rounded-md border border-white/45 bg-white/70 p-2 text-foreground/80 shadow-sm transition-colors hover:bg-white/88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/52 dark:text-sky-100/78 dark:hover:bg-slate-950/72"
          iconClassName="h-4 w-4"
        />
        <Link
          href={appRoutes.yearReview(selectedYear)}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("openSharePage")}
        </Link>
      </div>
    </div>
  );
};

export default ControlPanelYearReviewPage;
