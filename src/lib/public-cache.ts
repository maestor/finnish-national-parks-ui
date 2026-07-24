export const HOME_SUMMARY_TAG = "home-summary";
export const MAP_SUMMARY_TAG = "map-summary";
export const PUBLIC_VISITS_TAG = "public-visits";

export const getPublicParkTag = (slug: string) => `public-park:${slug}`;
export const getPublicTripTag = (slug: string) => `public-trip:${slug}`;

interface RevalidatePublicCacheOptions {
  parkSlug?: string | null;
  tripSlug?: string | null;
}

export const revalidatePublicCache = async ({
  parkSlug = null,
  tripSlug = null,
}: RevalidatePublicCacheOptions = {}): Promise<boolean> => {
  try {
    const response = await fetch("/api/revalidate-public-cache", {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ parkSlug, tripSlug }),
    });

    return response.ok;
  } catch {
    return false;
  }
};
