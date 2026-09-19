import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { fetchMapSummary } from "@/lib/frontend-summaries";
import { fetchPublicTripArchive } from "@/lib/public-trips";
import { appRoutes } from "@/lib/routes";
import { siteUrl } from "@/lib/site-url";

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  // Keep this metadata route request-time so builds do not need the backend.
  // The underlying public reads remain force-cached and tag-revalidated.
  await connection();
  const summary = await fetchMapSummary();
  const urls = new Set([
    appRoutes.home,
    appRoutes.parks,
    appRoutes.visits,
    appRoutes.trips,
    appRoutes.tripPlanner,
    ...summary.parks.map((park) => appRoutes.park(park.slug)),
  ]);
  let cursor: string | null = null;
  do {
    const archive = await fetchPublicTripArchive(cursor);
    for (const trip of archive.trips) urls.add(appRoutes.trip(trip.slug));
    cursor = archive.nextCursor;
  } while (cursor);
  return [...urls].map((path) => ({ url: siteUrl(path) }));
};

export default sitemap;
