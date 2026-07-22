import { getTranslations } from "next-intl/server";
import { PublicVisitsTimeline } from "@/components/visits/public-visits-timeline";
import { fetchMapSummary } from "@/lib/frontend-summaries";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { FilterableMapPark } from "@/lib/parks";
import {
  buildPublicVisitsMapModel,
  buildPublicVisitsTimelineModel,
  type FrontendTimelineVisit,
  fetchVisitsTimeline,
  resolvePublicVisitsFilters,
  resolvePublicVisitsView,
} from "@/lib/public-visits";

interface PublicVisitsPageProps {
  searchParams: Promise<{
    month?: string | string[];
    view?: string | string[];
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
  const { month, year, view: viewParam } = await searchParams;
  const view = resolvePublicVisitsView(viewParam);
  const t = await getTranslations("errors.generic");
  let visits: FrontendTimelineVisit[] = [];
  let mapParks: FilterableMapPark[] = [];
  let error: string | null = null;

  try {
    if (view === "map") {
      const [timelineResponse, mapSummary] = await Promise.all([
        fetchVisitsTimeline(),
        fetchMapSummary(),
      ]);
      visits = timelineResponse.visits;
      mapParks = mapSummary.parks;
    } else {
      const response = await fetchVisitsTimeline();
      visits = response.visits;
    }
  } catch (failure) {
    error = failure instanceof Error ? failure.message : t("unknownError");
  }

  const { selectedYear, selectedMonth } = resolvePublicVisitsFilters(visits, {
    yearParam: year,
    monthParam: month,
  });
  const effectiveSelectedMonth = view === "map" ? null : selectedMonth;

  // Build the timeline model server-side so the client bundle receives only the
  // filtered sections and filter metadata, not the full visit history.
  const model = buildPublicVisitsTimelineModel(visits, {
    selectedYear,
    selectedMonth: effectiveSelectedMonth,
  });
  const mapMarkers =
    view === "map"
      ? buildPublicVisitsMapModel(visits, mapParks, {
          selectedYear: model.selectedYear,
          selectedMonth: null,
        })
      : [];

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
        view={view}
        mapMarkers={mapMarkers}
        error={error}
      />
    </div>
  );
};

export default PublicVisitsPage;
