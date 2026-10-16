import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TripArchivePage } from "@/components/trips/trip-archive-page";
import { buildPageMetadata } from "@/lib/page-metadata";
import { fetchPublicTripArchive } from "@/lib/public-trips";
import { appRoutes } from "@/lib/routes";

export const generateMetadata = async ({ params }: { params: Promise<{ path?: string[] }> }) => {
  const { path } = await params;
  if (path?.length) return { robots: { index: false, follow: false } };
  const [t, metadataT] = await Promise.all([
    getTranslations("tripsArchive"),
    getTranslations("metadata"),
  ]);

  return buildPageMetadata(t("title"), metadataT("title"), {
    pagePath: appRoutes.trips,
    description: metadataT("tripsDescription"),
  });
};

// Generate on first request, keeping builds independent of the backend.
export const generateStaticParams = () => [];

const TripsPage = async ({ params }: { params: Promise<{ path?: string[] }> }) => {
  const { path } = await params;
  if (path?.length) notFound();

  const initialResponse = await fetchPublicTripArchive();

  return <TripArchivePage initialResponse={initialResponse} />;
};

export default TripsPage;
