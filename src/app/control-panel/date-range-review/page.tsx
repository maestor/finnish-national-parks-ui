import { AlertCircle, CalendarRange, Sparkles } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DateRangeReviewPublishControls } from "@/components/date-range-review/date-range-review-publish-controls";
import { DateRangeReviewShareList } from "@/components/date-range-review/date-range-review-share-list";
import { DateRangeReviewStory } from "@/components/date-range-review/date-range-review-story";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  type DateRangeReviewPreviewRequest,
  fetchAdminDateRangeReviewShares,
  fetchDateRangeReviewPreview,
} from "@/lib/date-range-review";
import { buildPageMetadata } from "@/lib/page-metadata";
import { type FrontendTimelineVisit, fetchVisitsTimeline } from "@/lib/public-visits";
import { appRoutes, createPathWithSearchParams } from "@/lib/routes";

export const dynamic = "force-dynamic";

interface ControlPanelDateRangeReviewPageProps {
  searchParams: Promise<{
    endDate?: string | string[];
    name?: string | string[];
    startDate?: string | string[];
    tab?: string | string[];
  }>;
}

interface DateRangeReviewFormValues {
  endDate: string;
  name: string;
  startDate: string;
}

type DateRangeReviewAdminTab = "preview" | "shares";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("fi-FI", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Helsinki",
});

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AUTO_RANGE_DAYS = 184;
const TAB_LINK_CLASS_NAME =
  "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ACTIVE_TAB_LINK_CLASS_NAME =
  "border-emerald-700/15 bg-[linear-gradient(145deg,#166534_0%,#0f766e_55%,#2563eb_100%)] text-primary-foreground";
const INACTIVE_TAB_LINK_CLASS_NAME =
  "border-white/45 bg-white/70 text-foreground/80 hover:bg-white/88 dark:border-white/10 dark:bg-slate-950/52 dark:text-sky-100/78 dark:hover:bg-slate-950/72";

const normalizeSearchParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

const parseRequestedTab = (value?: string | string[]): DateRangeReviewAdminTab =>
  normalizeSearchParam(value) === "shares" ? "shares" : "preview";

const formatDateTime = (value: string) => DATE_TIME_FORMATTER.format(new Date(value));

const buildDefaultName = (startDate: string, endDate: string) => `${startDate} - ${endDate}`;

const compareVisitsByDate = (left: FrontendTimelineVisit, right: FrontendTimelineVisit) =>
  right.visitedOn.localeCompare(left.visitedOn) ||
  right.createdAt.localeCompare(left.createdAt) ||
  right.id - left.id;

const isWithinAutoRangeLimit = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T12:00:00+03:00`);
  const end = new Date(`${endDate}T12:00:00+03:00`);
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) <= MAX_AUTO_RANGE_DAYS;
};

const deriveSuggestedPreview = (
  visits: FrontendTimelineVisit[],
): DateRangeReviewPreviewRequest | null => {
  const sortedVisits = [...visits].sort(compareVisitsByDate);

  if (sortedVisits.length < 3) {
    return null;
  }

  for (let index = 0; index <= sortedVisits.length - 3; index += 1) {
    const endDate = sortedVisits[index]?.visitedOn;
    const startDate = sortedVisits[index + 2]?.visitedOn;

    if (!(startDate && endDate)) {
      continue;
    }

    if (!isWithinAutoRangeLimit(startDate, endDate)) {
      continue;
    }

    return {
      endDate,
      name: buildDefaultName(startDate, endDate),
      startDate,
    };
  }

  return null;
};

const hasCompleteFormValues = ({ endDate, name, startDate }: DateRangeReviewFormValues) =>
  endDate.length > 0 && name.length > 0 && startDate.length > 0;

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel"),
    getTranslations("metadata"),
  ]);

  return buildPageMetadata(t("dateRangeReview.title"), metadataT("title"));
};

const ControlPanelDateRangeReviewPage = async ({
  searchParams,
}: ControlPanelDateRangeReviewPageProps) => {
  const {
    endDate: endDateParam,
    name: nameParam,
    startDate: startDateParam,
    tab: tabParam,
  } = await searchParams;
  const activeTab = parseRequestedTab(tabParam);
  const [controlPanelT, t] = await Promise.all([
    getTranslations("controlPanel"),
    getTranslations("dateRangeReview"),
  ]);
  const tabLinks = [
    {
      href: createPathWithSearchParams(appRoutes.controlPanel.dateRangeReview, { tab: "preview" }),
      key: "preview" as const,
      label: controlPanelT("dateRangeReview.tabs.preview"),
    },
    {
      href: createPathWithSearchParams(appRoutes.controlPanel.dateRangeReview, { tab: "shares" }),
      key: "shares" as const,
      label: controlPanelT("dateRangeReview.tabs.shares"),
    },
  ];

  if (activeTab === "shares") {
    const { shares } = await fetchAdminDateRangeReviewShares();

    return (
      <div className="max-w-5xl space-y-6">
        <section className="rounded-3xl border border-white/45 bg-white/70 p-6 shadow-[0_20px_48px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/56 dark:shadow-[0_28px_60px_rgba(2,6,23,0.3)]">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-500/8 px-3 py-1 text-sm font-medium text-primary dark:border-emerald-300/15 dark:bg-emerald-400/10">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>{t("eyebrow")}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {controlPanelT("dateRangeReview.title")}
            </h1>
            <p className="max-w-3xl text-muted-foreground">
              {controlPanelT("dateRangeReview.description")}
            </p>
          </div>

          <nav
            aria-label={controlPanelT("dateRangeReview.tabs.ariaLabel")}
            className="mt-5 flex flex-wrap gap-2"
          >
            {tabLinks.map((tabLink) => (
              <Link
                key={tabLink.key}
                href={tabLink.href}
                aria-current={activeTab === tabLink.key ? "page" : undefined}
                className={[
                  TAB_LINK_CLASS_NAME,
                  activeTab === tabLink.key
                    ? ACTIVE_TAB_LINK_CLASS_NAME
                    : INACTIVE_TAB_LINK_CLASS_NAME,
                ].join(" ")}
              >
                {tabLink.label}
              </Link>
            ))}
          </nav>
        </section>

        <DateRangeReviewShareList shares={shares} />
      </div>
    );
  }

  const { visits } = await fetchVisitsTimeline();
  const explicitFormValues = {
    endDate: normalizeSearchParam(endDateParam),
    name: normalizeSearchParam(nameParam),
    startDate: normalizeSearchParam(startDateParam),
  };
  const hasExplicitInput = Object.values(explicitFormValues).some((value) => value.length > 0);
  const suggestedPreview = deriveSuggestedPreview(visits);
  const formValues: DateRangeReviewFormValues = hasExplicitInput
    ? explicitFormValues
    : (suggestedPreview ?? {
        endDate: "",
        name: "",
        startDate: "",
      });
  const shouldFetchPreview = hasCompleteFormValues(formValues);

  let preview: Awaited<ReturnType<typeof fetchDateRangeReviewPreview>> | null = null;
  let previewError: string | null = null;

  if (shouldFetchPreview) {
    try {
      preview = await fetchDateRangeReviewPreview(formValues);
    } catch (error) {
      if (error instanceof ApiError) {
        previewError = error.message;
      } else {
        throw error;
      }
    }
  }

  const hasEnoughVisits = visits.length >= 3;
  return (
    <div className="max-w-5xl space-y-6">
      <section className="rounded-3xl border border-white/45 bg-white/70 p-6 shadow-[0_20px_48px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/56 dark:shadow-[0_28px_60px_rgba(2,6,23,0.3)]">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-500/8 px-3 py-1 text-sm font-medium text-primary dark:border-emerald-300/15 dark:bg-emerald-400/10">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>{t("eyebrow")}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {controlPanelT("dateRangeReview.title")}
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            {controlPanelT("dateRangeReview.description")}
          </p>
        </div>

        <nav
          aria-label={controlPanelT("dateRangeReview.tabs.ariaLabel")}
          className="mt-5 flex flex-wrap gap-2"
        >
          {tabLinks.map((tabLink) => (
            <Link
              key={tabLink.key}
              href={tabLink.href}
              aria-current={activeTab === tabLink.key ? "page" : undefined}
              className={[
                TAB_LINK_CLASS_NAME,
                activeTab === tabLink.key
                  ? ACTIVE_TAB_LINK_CLASS_NAME
                  : INACTIVE_TAB_LINK_CLASS_NAME,
              ].join(" ")}
            >
              {tabLink.label}
            </Link>
          ))}
        </nav>

        <form className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_auto]">
          <div className="space-y-2">
            <Label htmlFor="date-range-review-name">{t("form.nameLabel")}</Label>
            <input
              id="date-range-review-name"
              name="name"
              defaultValue={formValues.name}
              placeholder={t("form.namePlaceholder")}
              className="h-11 w-full rounded-2xl border border-white/45 bg-white/84 px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/56"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-range-review-start-date">{t("form.startDateLabel")}</Label>
            <input
              id="date-range-review-start-date"
              name="startDate"
              type="date"
              defaultValue={formValues.startDate}
              className="h-11 w-full rounded-2xl border border-white/45 bg-white/84 px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/56"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-range-review-end-date">{t("form.endDateLabel")}</Label>
            <input
              id="date-range-review-end-date"
              name="endDate"
              type="date"
              defaultValue={formValues.endDate}
              className="h-11 w-full rounded-2xl border border-white/45 bg-white/84 px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/56"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("form.submit")}
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-start gap-4 text-sm text-muted-foreground">
          <p className="inline-flex items-center gap-2">
            <CalendarRange className="h-4 w-4" aria-hidden="true" />
            {t("form.helper")}
          </p>
          <p>{t("form.validationHint")}</p>
        </div>

        {!hasExplicitInput && suggestedPreview !== null && (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("suggestedPeriod", {
              endDate: suggestedPreview.endDate,
              name: suggestedPreview.name,
              startDate: suggestedPreview.startDate,
            })}
          </p>
        )}
      </section>

      {preview !== null && (
        <>
          <section className="rounded-3xl border border-white/45 bg-white/70 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/56 dark:shadow-[0_24px_52px_rgba(2,6,23,0.28)]">
            <p className="text-sm text-muted-foreground">
              {controlPanelT("dateRangeReview.generatedAt", {
                date: formatDateTime(preview.generatedAt),
              })}
            </p>
          </section>

          <DateRangeReviewPublishControls
            overview={preview.overview}
            publishInfo={preview.publishInfo}
            status={preview.status}
          />

          <DateRangeReviewStory
            overview={preview.overview}
            story={preview.story}
            mode="preview"
            headingLevel={2}
          />
        </>
      )}

      {previewError !== null && (
        <section className="rounded-3xl border border-destructive/25 bg-destructive/6 p-5 text-sm text-destructive dark:border-destructive/35 dark:bg-destructive/12">
          <p role="alert" className="inline-flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{previewError}</span>
          </p>
        </section>
      )}

      {preview === null && previewError === null && (
        <section className="rounded-3xl border border-dashed border-white/45 bg-white/58 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/42">
          <div className="mx-auto max-w-2xl space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">
              {hasEnoughVisits
                ? t("emptyState.title")
                : controlPanelT("dateRangeReview.notEnoughVisitsTitle")}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {hasEnoughVisits
                ? t("emptyState.description")
                : controlPanelT("dateRangeReview.notEnoughVisitsDescription")}
            </p>
          </div>
        </section>
      )}
    </div>
  );
};

export default ControlPanelDateRangeReviewPage;
