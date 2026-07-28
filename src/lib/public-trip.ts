import { apiPublicFetch } from "./api";
import type { PublicTripDetail } from "./trips";

export const fetchPublicTripBySlug = async (slug: string): Promise<PublicTripDetail> =>
  apiPublicFetch<PublicTripDetail>(`/api/trips/slug/${slug}`, {
    // Public trip payloads include presigned visit images, so caching them can
    // freeze expired URLs into the rendered page.
    cache: "no-store",
  });
