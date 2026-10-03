import { apiAuthFetch, apiPublicFetch } from "./api";
import { getPublicTripTag } from "./public-cache";
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
    cache: "force-cache",
    next: {
      tags: [getPublicTripTag(slug)],
    },
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

export const fetchAdminTripPreview = async (tripId: number): Promise<PublicTripDetail> =>
  apiAuthFetch<PublicTripDetail>(`/api/admin/trips/${tripId}/preview`, { cache: "no-store" });

export const fetchAdminTripPreviewRoute = async (
  tripId: number,
  { signal }: FetchPublicTripBySlugOptions = {},
): Promise<PublicTripRouteResponse> =>
  apiAuthFetch<PublicTripRouteResponse>(`/api/admin/trips/${tripId}/preview/route`, {
    cache: "no-store",
    signal: signal ?? AbortSignal.timeout(PUBLIC_TRIP_REQUEST_TIMEOUT_MS),
  });

export const fetchAdminTripPreviewVisitImages = async (
  tripId: number,
  visitId: number,
  { offset = 0, signal }: FetchPublicTripStopImagesOptions = {},
): Promise<PublicTripStopImagesResponse> =>
  apiAuthFetch<PublicTripStopImagesResponse>(
    `/api/admin/trips/${tripId}/preview/visits/${visitId}/images?limit=12&offset=${offset}`,
    { cache: "no-store", signal: signal ?? AbortSignal.timeout(PUBLIC_TRIP_REQUEST_TIMEOUT_MS) },
  );

export const fetchAdminTripPreviewStopImages = async (
  tripId: number,
  stopId: number,
  { offset = 0, signal }: FetchPublicTripStopImagesOptions = {},
): Promise<PublicTripStopImagesResponse> =>
  apiAuthFetch<PublicTripStopImagesResponse>(
    `/api/admin/trips/${tripId}/preview/stops/${stopId}/images?limit=12&offset=${offset}`,
    { cache: "no-store", signal: signal ?? AbortSignal.timeout(PUBLIC_TRIP_REQUEST_TIMEOUT_MS) },
  );
