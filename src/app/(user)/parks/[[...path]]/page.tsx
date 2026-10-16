import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ParkExplorer } from "@/components/map/park-explorer";
import { fetchMapSummary } from "@/lib/frontend-summaries";
import { buildPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = async ({ params }: { params: Promise<{ path?: string[] }> }) => {
  const { path } = await params;
  if (path?.length) return { robots: { index: false, follow: false } };
  const [t, metadataT] = await Promise.all([getTranslations("home"), getTranslations("metadata")]);
  return buildPageMetadata(t("mapTitle"), metadataT("title"), {
    pagePath: "/paikat",
    description: metadataT("parksDescription"),
  });
};

// Generate on first request, keeping builds independent of the backend.
export const generateStaticParams = () => [];

const ParksMapPage = async ({ params }: { params: Promise<{ path?: string[] }> }) => {
  const { path } = await params;
  if (path?.length) notFound();
  const summary = await fetchMapSummary();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ParkExplorer parks={summary.parks} error={null} />
    </div>
  );
};

export default ParksMapPage;
