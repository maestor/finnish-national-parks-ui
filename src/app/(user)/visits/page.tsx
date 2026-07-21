import { getTranslations } from "next-intl/server";
import { PublicVisitsTimeline } from "@/components/visits/public-visits-timeline";
import { buildPageMetadata } from "@/lib/page-metadata";
import {
  buildPublicVisitsTimelineModel,
  type FrontendTimelineVisit,
  fetchVisitsTimeline,
  resolvePublicVisitsFilters,
} from "@/lib/public-visits";

interface PublicVisitsPageProps {
  searchParams: Promise<{
    month?: string | string[];
    year?: string | string[];
  }>;
}

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("visits"),
    getTranslations("metadata"),
  ]);

  return buildPageMetadata(t("title"), metadataT("title"));
};

const PublicVisitsPage = async ({ searchParams }: PublicVisitsPageProps) => {
  const { month, year } = await searchParams;
  const t = await getTranslations("errors.generic");
  let visits: FrontendTimelineVisit[] = [];
  let error: string | null = null;

  try {
    const response = await fetchVisitsTimeline();
    visits = response.visits;
  } catch (failure) {
    error = failure instanceof Error ? failure.message : t("unknownError");
  }

  const { selectedYear, selectedMonth } = resolvePublicVisitsFilters(visits, {
    yearParam: year,
    monthParam: month,
  });

  // Build the timeline model server-side so the client bundle receives only the
  // filtered sections and filter metadata, not the full visit history.
  const model = buildPublicVisitsTimelineModel(visits, { selectedYear, selectedMonth });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PublicVisitsTimeline
        availableYears={model.availableYears}
        filteredCount={model.filteredVisits.length}
        monthOptions={model.monthOptions}
        sections={model.sections}
        selectedMonth={model.selectedMonth}
        selectedYear={model.selectedYear}
        totalCount={visits.length}
        error={error}
      />
    </div>
  );
};

export default PublicVisitsPage;
