import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig, SerwistPlugin } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist } from "serwist";
import {
  deleteLegacyRuntimeCaches,
  getRuntimeCachePolicy,
  shouldCacheResponse,
} from "@/lib/service-worker-cache-policy";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const staticAssetResponseGuard: SerwistPlugin = {
  cacheWillUpdate: ({ response }) => (shouldCacheResponse(response) ? response : null),
};

const runtimeCaching: RuntimeCaching[] = [
  // This must remain first: only the listed public static assets may enter Cache Storage.
  {
    matcher: ({ request, sameOrigin, url }) =>
      request.method === "GET" &&
      getRuntimeCachePolicy({
        isRscRequest: request.headers.get("RSC") === "1",
        pathname: url.pathname,
        sameOrigin,
      }) === "network-only",
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ request, sameOrigin, url }) =>
      request.method === "GET" &&
      getRuntimeCachePolicy({
        isRscRequest: request.headers.get("RSC") === "1",
        pathname: url.pathname,
        sameOrigin,
      }) === "cache-static",
    handler: new CacheFirst({
      cacheName: "public-static-v2",
      plugins: [
        staticAssetResponseGuard,
        new ExpirationPlugin({
          maxAgeSeconds: 7 * 24 * 60 * 60,
          maxEntries: 64,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// Remove only caches created by the previous broad runtime policy. The precache
// and unrelated origin storage are deliberately preserved.
self.addEventListener("activate", (event) => {
  event.waitUntil(deleteLegacyRuntimeCaches(self.caches));
});

serwist.addEventListeners();
