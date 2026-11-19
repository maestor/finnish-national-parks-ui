"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { components } from "@/lib/api-types";

export type Weather = components["schemas"]["ParkWeather"];
const REFRESH_MS = 10 * 60_000;
export const weatherMetrics = ["temperature", "precipitation", "wind"] as const;

const currentWeather = (weather: Weather, now: number): Weather => {
  const observation = weather.observation;
  const measurements = observation
    ? weatherMetrics.flatMap((metric) => {
        const reading = observation[metric];
        return reading && Date.parse(reading.expiresAt) > now ? [[metric, reading]] : [];
      })
    : [];
  const forecast = weather.forecast;
  const slots =
    forecast && Date.parse(forecast.expiresAt) > now
      ? forecast.slots.filter((slot) => Date.parse(slot.time) > now)
      : [];
  return {
    ...(observation && measurements.length > 0
      ? { observation: { station: observation.station, ...Object.fromEntries(measurements) } }
      : {}),
    ...(forecast && slots.length > 0 ? { forecast: { ...forecast, slots } } : {}),
  };
};

const ParkWeatherContext = createContext<{ weather: Weather; hasAbout: boolean } | null>(null);

export const useParkWeather = () => useContext(ParkWeatherContext);

export const ParkWeatherProvider = ({
  children,
  parkSlug,
  hasStaticAbout,
}: {
  children: ReactNode;
  parkSlug: string;
  hasStaticAbout: boolean;
}) => {
  const [weather, setWeather] = useState<Weather>({});

  useEffect(() => {
    let latest: Weather = {};
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let pending: AbortController | undefined;
    let active = true;

    const publishCurrentWeather = () => {
      clearTimeout(expiry);
      const now = Date.now();
      latest = currentWeather(latest, now);
      setWeather(latest);
      const deadlines = weatherMetrics.map((metric) => latest.observation?.[metric]?.expiresAt);
      if (latest.forecast) {
        deadlines.push(
          latest.forecast.expiresAt,
          ...latest.forecast.slots.map((slot) => slot.time),
        );
      }
      const milliseconds = Math.min(
        ...deadlines.flatMap((deadline) => (deadline ? [Date.parse(deadline) - now] : [])),
      );
      if (Number.isFinite(milliseconds)) expiry = setTimeout(publishCurrentWeather, milliseconds);
    };

    const refresh = async () => {
      if (pending || document.visibilityState === "hidden" || !navigator.onLine) return;
      pending = new AbortController();
      try {
        latest =
          (await apiFetch<Weather>(`/api/parks/${encodeURIComponent(parkSlug)}/weather`, {
            cache: "no-store",
            signal: AbortSignal.any([pending.signal, AbortSignal.timeout(6_000)]),
          })) ?? {};
      } catch {
        // The existing readings expire by timestamp even while disconnected.
      } finally {
        pending = undefined;
        if (active) publishCurrentWeather();
      }
    };

    const revisit = () => {
      if (document.visibilityState === "hidden") return;
      publishCurrentWeather();
      void refresh();
    };

    void refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    window.addEventListener("online", revisit);
    window.addEventListener("pageshow", revisit);
    document.addEventListener("visibilitychange", revisit);
    return () => {
      active = false;
      pending?.abort();
      clearInterval(interval);
      clearTimeout(expiry);
      window.removeEventListener("online", revisit);
      window.removeEventListener("pageshow", revisit);
      document.removeEventListener("visibilitychange", revisit);
    };
  }, [parkSlug]);

  const hasAbout =
    hasStaticAbout || weather.observation !== undefined || weather.forecast !== undefined;
  return (
    <ParkWeatherContext.Provider value={{ weather, hasAbout }}>
      {children}
    </ParkWeatherContext.Provider>
  );
};

export const ParkAboutVisibility = ({ children }: { children: ReactNode }) =>
  useParkWeather()?.hasAbout ? children : null;

export const ParkLocationMaterials = ({ children }: { children: ReactNode }) =>
  useParkWeather()?.hasAbout ? null : children;
