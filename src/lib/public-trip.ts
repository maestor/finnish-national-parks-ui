import { apiPublicFetch } from "./api";
import { PUBLIC_TRIP_REQUEST_TIMEOUT_MS } from "./public-trip-timeout";
import type {
  PublicTripDetail,
  PublicTripRouteResponse,
  PublicTripStopImagesResponse,
} from "./trips";

interface FetchPublicTripBySlugOptions {
  signal?: AbortSignal;
}

interface FetchPublicTripStopImagesOptions extends FetchPublicTripBySlugOptions {
  offset?: number;
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

export const fetchPublicTripRoute = async (
  slug: string,
  { signal }: FetchPublicTripBySlugOptions = {},
): Promise<PublicTripRouteResponse> =>
  apiPublicFetch<PublicTripRouteResponse>(`/api/trips/slug/${slug}/route`, {
    cache: "no-store",
    signal: signal ?? AbortSignal.timeout(PUBLIC_TRIP_REQUEST_TIMEOUT_MS),
  });

export const fetchPublicTripStopImages = async (
  slug: string,
  stopId: number,
  { offset = 0, signal }: FetchPublicTripStopImagesOptions = {},
): Promise<PublicTripStopImagesResponse> =>
  apiPublicFetch<PublicTripStopImagesResponse>(
    `/api/trips/slug/${slug}/stops/${stopId}/images${offset === 0 ? "" : `?offset=${offset}`}`,
    {
      cache: "no-store",
      signal: signal ?? AbortSignal.timeout(PUBLIC_TRIP_REQUEST_TIMEOUT_MS),
    },
  );
