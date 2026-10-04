"use client";

import {
  SerwistProvider as NextSerwistProvider,
  type SerwistProviderProps,
} from "@serwist/turbopack/react";
import { useEffect } from "react";

export const SerwistProvider = ({ disable = false, swUrl, ...props }: SerwistProviderProps) => {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !disable || !("serviceWorker" in navigator)) {
      return;
    }

    // Disabling registration does not detach a worker left by an earlier local build.
    const clearDevelopmentWorker = async () => {
      const workerUrl = new URL(swUrl, window.location.href).href;
      const registrations = (await navigator.serviceWorker.getRegistrations()).filter(
        (registration) =>
          [registration.active, registration.waiting, registration.installing].some(
            (worker) => worker?.scriptURL === workerUrl,
          ),
      );
      if (registrations.length === 0) {
        return;
      }

      await Promise.all(registrations.map((registration) => registration.unregister()));
      const ownedCaches = new Set([
        "public-static-v2",
        ...registrations.map((registration) => `serwist-precache-v2-${registration.scope}`),
      ]);
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.filter((name) => ownedCaches.has(name)).map((name) => caches.delete(name)),
      );
    };

    void clearDevelopmentWorker().catch((error: unknown) => {
      console.log("Failed to clear the development service worker.", error);
    });
  }, [disable, swUrl]);

  return <NextSerwistProvider swUrl={swUrl} disable={disable} {...props} />;
};
