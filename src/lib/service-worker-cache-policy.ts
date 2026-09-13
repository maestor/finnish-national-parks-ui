export type RuntimeCachePolicy = "cache-static" | "network-only";

type RuntimeRequest = {
  isRscRequest?: boolean;
  pathname: string;
  sameOrigin: boolean;
};

type CacheStorageLike = Pick<CacheStorage, "delete" | "keys">;

const legacyRuntimeCacheNames = new Set([
  "apis",
  "cross-origin",
  "next-data",
  "next-image",
  "others",
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "static-data-assets",
  "static-image-assets",
]);

const isPublicStaticAsset = (pathname: string) =>
  pathname.startsWith("/_next/static/") ||
  pathname.startsWith("/icons/") ||
  pathname === "/favicon.svg";

export const getRuntimeCachePolicy = ({
  isRscRequest = false,
  pathname,
  sameOrigin,
}: RuntimeRequest): RuntimeCachePolicy => {
  if (!sameOrigin || isRscRequest || !isPublicStaticAsset(pathname)) {
    return "network-only";
  }

  return "cache-static";
};

export const shouldCacheResponse = (response: Response) => {
  const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? "";

  return response.ok && !cacheControl.includes("no-store") && !cacheControl.includes("private");
};

export const deleteLegacyRuntimeCaches = async (cacheStorage: CacheStorageLike) => {
  const cacheNames = await cacheStorage.keys();
  const namesToDelete = cacheNames.filter((cacheName) => legacyRuntimeCacheNames.has(cacheName));

  await Promise.all(namesToDelete.map((cacheName) => cacheStorage.delete(cacheName)));
};
