import { apiPublicFetch } from "./api";
import type { paths } from "./api-types";

export type PublicTripArchiveItem =
  paths["/api/trips/archive"]["get"]["responses"][200]["content"]["application/json"]["trips"][number];

export type PublicTripArchiveResponse =
  paths["/api/trips/archive"]["get"]["responses"][200]["content"]["application/json"];

export const PUBLIC_TRIP_ARCHIVE_PAGE_SIZE = 12;

const createPublicTripArchivePath = (cursor?: string | null) => {
  const searchParams = new URLSearchParams({
    limit: String(PUBLIC_TRIP_ARCHIVE_PAGE_SIZE),
  });

  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  return `/api/trips/archive?${searchParams.toString()}`;
};

export const fetchPublicTripArchive = async (cursor?: string | null) =>
  apiPublicFetch<PublicTripArchiveResponse>(createPublicTripArchivePath(cursor), {
    cache: "no-store",
  });

export { createPublicTripArchivePath };
