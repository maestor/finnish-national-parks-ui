import { describe, expect, it } from "vitest";
import {
  deleteLegacyRuntimeCaches,
  getRuntimeCachePolicy,
  shouldCacheResponse,
} from "./service-worker-cache-policy";

describe("service worker cache policy", () => {
  it("keeps API, account, admin, review-share, optimized-image, RSC, and cross-origin requests out of Cache Storage", () => {
    expect(getRuntimeCachePolicy({ pathname: "/api/visits", sameOrigin: true })).toBe(
      "network-only",
    );
    expect(getRuntimeCachePolicy({ pathname: "/auth/me", sameOrigin: true })).toBe("network-only");
    expect(getRuntimeCachePolicy({ pathname: "/hallinta", sameOrigin: true })).toBe("network-only");
    expect(getRuntimeCachePolicy({ pathname: "/control-panel", sameOrigin: true })).toBe(
      "network-only",
    );
    expect(
      getRuntimeCachePolicy({ pathname: "/ajanjaksokatsaus/jako/share-id", sameOrigin: true }),
    ).toBe("network-only");
    expect(
      getRuntimeCachePolicy({ pathname: "/year-review/share/share-id", sameOrigin: true }),
    ).toBe("network-only");
    expect(getRuntimeCachePolicy({ pathname: "/_next/image", sameOrigin: true })).toBe(
      "network-only",
    );
    expect(
      getRuntimeCachePolicy({ pathname: "/retki/testi", sameOrigin: true, isRscRequest: true }),
    ).toBe("network-only");
    expect(getRuntimeCachePolicy({ pathname: "/images/visit.jpg", sameOrigin: false })).toBe(
      "network-only",
    );
  });

  it("caches only same-origin public static assets", () => {
    expect(
      getRuntimeCachePolicy({ pathname: "/_next/static/chunks/app.js", sameOrigin: true }),
    ).toBe("cache-static");
    expect(getRuntimeCachePolicy({ pathname: "/icons/icon-32x32.png", sameOrigin: true })).toBe(
      "cache-static",
    );
    expect(getRuntimeCachePolicy({ pathname: "/favicon.svg", sameOrigin: true })).toBe(
      "cache-static",
    );
  });

  it("refuses private and no-store responses even from a cacheable static route", () => {
    expect(shouldCacheResponse(new Response("ok", { status: 200 }))).toBe(true);
    expect(
      shouldCacheResponse(
        new Response("private", { headers: { "Cache-Control": "private, no-store" } }),
      ),
    ).toBe(false);
  });

  it("removes legacy app runtime caches without touching the active precache or unrelated caches", async () => {
    const deleted: string[] = [];
    const cacheStorage = {
      delete: async (cacheName: string) => {
        deleted.push(cacheName);
        return true;
      },
      keys: async () => ["apis", "pages", "next-image", "serwist-precache-v1", "another-app-cache"],
    };

    await deleteLegacyRuntimeCaches(cacheStorage);

    expect(deleted).toEqual(["apis", "pages", "next-image"]);
  });
});
