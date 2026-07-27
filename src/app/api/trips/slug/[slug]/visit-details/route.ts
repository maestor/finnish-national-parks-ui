import { ApiError, apiPublicFetch } from "@/lib/api";
import type { ParkVisits } from "@/lib/parks";
import { fetchPublicTripBySlug } from "@/lib/public-trip";
import {
  buildPublicTripVisitDetailsResponse,
  collectTripVisitDetailTargets,
} from "@/lib/public-trip-visit-details";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export const GET = async (_request: Request, { params }: RouteContext) => {
  const { slug } = await params;

  try {
    const trip = await fetchPublicTripBySlug(slug);
    const targets = collectTripVisitDetailTargets(trip);

    if (targets.size === 0) {
      return Response.json({ visits: {} });
    }

    const parkVisitsBySlug = new Map(
      await Promise.all(
        [...targets.keys()].map(async (parkSlug) => {
          const parkVisits = await apiPublicFetch<ParkVisits>(`/api/parks/${parkSlug}/visits`, {
            cache: "force-cache",
          });
          return [parkSlug, parkVisits.visits] as const;
        }),
      ),
    );

    return Response.json(buildPublicTripVisitDetailsResponse(trip, parkVisitsBySlug));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    throw error;
  }
};
