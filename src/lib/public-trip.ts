import { apiPublicFetch } from "./api";
import { getPublicTripTag } from "./public-cache";
import type { PublicTripDetail } from "./trips";

export const fetchPublicTripBySlug = async (slug: string): Promise<PublicTripDetail> =>
  apiPublicFetch<PublicTripDetail>(`/api/trips/slug/${slug}`, {
    cache: "force-cache",
    next: {
      tags: [getPublicTripTag(slug)],
    },
  });
