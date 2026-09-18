import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { TripArchivePage } from "@/components/trips/trip-archive-page";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { PublicTripArchiveResponse } from "@/lib/public-trips";
import { fetchPublicTripArchive } from "@/lib/public-trips";
import { appRoutes } from "@/lib/routes";

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("tripsArchive"),
    getTranslations("metadata"),
  ]);

  return buildPageMetadata(t("title"), metadataT("title"), {
    pagePath: appRoutes.trips,
    description: metadataT("tripsDescription"),
  });
};

const TripsPage = async () => {
  // Keep page rendering request-time so builds do not need the backend.
  // The archive response itself remains explicitly force-cached and tagged.
  await connection();

  let initialResponse: PublicTripArchiveResponse | null = null;

  try {
    initialResponse = await fetchPublicTripArchive();
  } catch {
    initialResponse = null;
  }

  return <TripArchivePage initialResponse={initialResponse} />;
};

export default TripsPage;
