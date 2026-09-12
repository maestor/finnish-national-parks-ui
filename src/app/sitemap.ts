import type { MetadataRoute } from "next";
import { apiPublicFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";
import { fetchPublicTripArchive } from "@/lib/public-trips";
import { appRoutes } from "@/lib/routes";
import { siteUrl } from "@/lib/site-url";

// Generate on request: builds need no backend and visibility changes must not
// leave hidden places in a cached sitemap. Never forward a visitor's session.
export const dynamic = "force-dynamic";

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const summary = await apiPublicFetch<
    paths["/api/map-summary"]["get"]["responses"][200]["content"]["application/json"]
  >("/api/map-summary", { cache: "no-store" });
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
