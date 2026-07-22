"use client";

import dynamic from "next/dynamic";
import { MapLoadingFallback } from "../map/map-loading-fallback";

export const LazyVisitsMap = dynamic(() => import("./visits-map").then((mod) => mod.VisitsMap), {
  ssr: false,
  loading: MapLoadingFallback,
});
