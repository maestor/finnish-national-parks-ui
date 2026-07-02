import { PublicVisitsTimeline } from "@/components/visits/public-visits-timeline";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { VisitWithPark } from "@/lib/parks";
import { fetchPublicVisits, resolvePublicVisitsFilters } from "@/lib/public-visits";
import { getTranslations } from "next-intl/server";

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
  let visits: VisitWithPark[] = [];
  let error: string | null = null;

  try {
    const response = await fetchPublicVisits();
    visits = response.visits;
  } catch (failure) {
    error = failure instanceof Error ? failure.message : t("unknownError");
  }

  const { selectedYear, selectedMonth } = resolvePublicVisitsFilters(visits, {
    yearParam: year,
    monthParam: month,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PublicVisitsTimeline
        visits={visits}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        error={error}
      />
    </div>
  );
};

export default PublicVisitsPage;
