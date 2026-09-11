import { getTranslations } from "next-intl/server";
import { TripArchivePage } from "@/components/trips/trip-archive-page";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { PublicTripArchiveResponse } from "@/lib/public-trips";
import { fetchPublicTripArchive } from "@/lib/public-trips";
import { appRoutes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("tripsArchive"),
    getTranslations("metadata"),
  ]);

  return buildPageMetadata(t("title"), metadataT("title"), {
    pagePath: appRoutes.trips,
  });
};

const TripsPage = async () => {
  let initialResponse: PublicTripArchiveResponse | null = null;

  try {
    initialResponse = await fetchPublicTripArchive();
  } catch {
    initialResponse = null;
  }

  return <TripArchivePage initialResponse={initialResponse} />;
};

export default TripsPage;
