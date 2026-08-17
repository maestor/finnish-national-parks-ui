import { apiPublicFetch } from "./api";
import { PUBLIC_TRIP_REQUEST_TIMEOUT_MS } from "./public-trip-timeout";
import type { PublicTripDetail } from "./trips";

interface FetchPublicTripBySlugOptions {
  signal?: AbortSignal;
}

export const fetchPublicTripBySlug = async (
  slug: string,
  { signal }: FetchPublicTripBySlugOptions = {},
): Promise<PublicTripDetail> =>
  apiPublicFetch<PublicTripDetail>(`/api/trips/slug/${slug}`, {
    // Public trip payloads include presigned visit images, so caching them can
    // freeze expired URLs into the rendered page.
    cache: "no-store",
    signal: signal ?? AbortSignal.timeout(PUBLIC_TRIP_REQUEST_TIMEOUT_MS),
  });
