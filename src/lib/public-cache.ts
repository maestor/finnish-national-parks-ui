export const HOME_SUMMARY_TAG = "home-summary";
export const MAP_SUMMARY_TAG = "map-summary";
export const PUBLIC_VISITS_TAG = "public-visits";

export const getPublicParkTag = (slug: string) => `public-park:${slug}`;

interface RevalidatePublicCacheOptions {
  parkSlug?: string | null;
}

export const revalidatePublicCache = async ({
  parkSlug = null,
}: RevalidatePublicCacheOptions = {}): Promise<boolean> => {
  try {
    const response = await fetch("/api/revalidate-public-cache", {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ parkSlug }),
    });

    return response.ok;
  } catch {
    return false;
  }
};
