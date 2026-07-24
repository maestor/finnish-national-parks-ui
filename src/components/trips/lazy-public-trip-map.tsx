"use client";

import dynamic from "next/dynamic";
import { MapLoadingFallback } from "../map/map-loading-fallback";

export const LazyPublicTripMap = dynamic(
  () => import("./public-trip-map").then((mod) => mod.PublicTripMap),
  {
    ssr: false,
    loading: MapLoadingFallback,
  },
);
