import { ParkExplorer } from "@/components/map/park-explorer";
import { type PublicMapSummary, fetchPublicMapSummary } from "@/lib/public-summaries";
import { getTranslations } from "next-intl/server";

export const generateMetadata = async () => {
  const t = await getTranslations("home");
  return {
    title: t("mapTitle"),
  };
};

const ParksMapPage = async () => {
  let parks: PublicMapSummary["parks"] = [];
  let error: string | null = null;

  try {
    const summary = await fetchPublicMapSummary();
    parks = summary.parks;
  } catch (failure) {
    const t = await getTranslations("errors.generic");
    error = failure instanceof Error ? failure.message : t("unknownError");
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <ParkExplorer parks={parks} error={error} />
    </main>
  );
};

export default ParksMapPage;
