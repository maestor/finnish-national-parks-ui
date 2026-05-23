export const PUBLIC_HOME_SUMMARY_TAG = "public-home-summary";
export const PUBLIC_MAP_SUMMARY_TAG = "public-map-summary";

export const getPublicParkTag = (slug: string) => `public-park:${slug}`;

interface RevalidatePublicCacheOptions {
  parkSlug?: string | null;
}

export const revalidatePublicCache = async ({
  parkSlug = null,
}: RevalidatePublicCacheOptions = {}): Promise<boolean> => {
  try {
    const response = await fetch("/api/revalidate-public-cache", {
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
