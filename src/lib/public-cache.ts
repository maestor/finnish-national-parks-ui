export const HOME_SUMMARY_TAG = "home-summary";
export const MAP_SUMMARY_TAG = "map-summary";
export const PUBLIC_TRIPS_TAG = "public-trips";
export const PUBLIC_VISITS_TAG = "public-visits";
export const PUBLIC_PARK_DETAILS_TAG = "public-park-details";
export const PUBLIC_TRIP_DETAILS_TAG = "public-trip-details";
export const MAX_PARK_SLUGS_PER_REVALIDATION = 500;

export const getPublicParkTag = (slug: string) => `public-park:${slug}`;
export const getPublicTripTag = (slug: string) => `public-trip:${slug}`;

interface RevalidatePublicCacheOptions {
  expireImmediately?: boolean;
  parkSlug?: string | null;
  parkSlugs?: string[];
  tripSlug?: string | null;
}

export const revalidatePublicCache = async ({
  parkSlug = null,
  parkSlugs,
  tripSlug = null,
  expireImmediately = false,
}: RevalidatePublicCacheOptions = {}): Promise<boolean> => {
  try {
    let offset = 0;
    do {
      const response = await fetch("/api/revalidate-public-cache", {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expireImmediately,
          parkSlug,
          parkSlugs: parkSlugs?.slice(offset, offset + MAX_PARK_SLUGS_PER_REVALIDATION),
          tripSlug,
        }),
      });
      if (!response.ok) return false;
      offset += MAX_PARK_SLUGS_PER_REVALIDATION;
    } while (offset < (parkSlugs?.length ?? 0));
    return true;
  } catch {
    return false;
  }
};
