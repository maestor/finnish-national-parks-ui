import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { YearReviewPublishControls } from "@/components/year-review/year-review-publish-controls";
import { YearReviewStory } from "@/components/year-review/year-review-story";
import { cn } from "@/lib/cn";
import { buildPageMetadata } from "@/lib/page-metadata";
import { buildAvailableVisitYears, fetchVisitsTimeline } from "@/lib/public-visits";
import { appRoutes, createPathWithSearchParams } from "@/lib/routes";
import { fetchYearReviewPreview } from "@/lib/year-review";

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

const YEAR_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Helsinki",
  year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("fi-FI", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Helsinki",
});

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

const getCurrentHelsinkiYear = () => Number.parseInt(YEAR_FORMATTER.format(new Date()), 10);

const formatDateTime = (value: string) => DATE_TIME_FORMATTER.format(new Date(value));

const ControlPanelYearReviewPage = async ({ searchParams }: ControlPanelYearReviewPageProps) => {
  const { year: yearParam } = await searchParams;
  const [t, controlPanelT, { visits }] = await Promise.all([
    getTranslations("yearReview"),
    getTranslations("controlPanel"),
    fetchVisitsTimeline(),
  ]);
  const availableYears =
    visits.length === 0 ? [getCurrentHelsinkiYear()] : buildAvailableVisitYears(visits);
  const requestedYear = parseRequestedYear(yearParam);
  const selectedYear =
    requestedYear !== null && availableYears.includes(requestedYear)
      ? requestedYear
      : availableYears[0];
  const preview = await fetchYearReviewPreview(selectedYear);

  return (
    <div className="max-w-5xl space-y-6">
      <section className="rounded-3xl border border-white/45 bg-white/70 p-6 shadow-[0_20px_48px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/56 dark:shadow-[0_28px_60px_rgba(2,6,23,0.3)]">
        <h1 className="text-2xl font-bold tracking-tight">{controlPanelT("yearReview.title")}</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          {controlPanelT("yearReview.description")}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {controlPanelT("yearReview.generatedAt", { date: formatDateTime(preview.generatedAt) })}
        </p>

        <nav aria-label={t("selectYear")} className="mt-5 flex flex-wrap gap-2">
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
      </section>

      <YearReviewPublishControls
        year={selectedYear}
        status={preview.status}
        publishInfo={preview.publishInfo}
      />

      <YearReviewStory story={preview.story} mode="preview" headingLevel={2} />
    </div>
  );
};

export default ControlPanelYearReviewPage;
