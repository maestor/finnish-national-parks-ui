import { getTranslations } from "next-intl/server";
import { ParkExplorer } from "@/components/map/park-explorer";
import { fetchMapSummary, type MapSummary } from "@/lib/frontend-summaries";
import { buildPageMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([getTranslations("home"), getTranslations("metadata")]);
  return buildPageMetadata(t("mapTitle"), metadataT("title"));
};

const ParksMapPage = async () => {
  let parks: MapSummary["parks"] = [];
  let error: string | null = null;

  try {
    const summary = await fetchMapSummary();
    parks = summary.parks;
  } catch (failure) {
    const t = await getTranslations("errors.generic");
    error = failure instanceof Error ? failure.message : t("unknownError");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ParkExplorer parks={parks} error={error} />
    </div>
  );
};

export default ParksMapPage;
