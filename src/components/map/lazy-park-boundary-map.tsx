"use client";

import dynamic from "next/dynamic";
import { MapLoadingFallback } from "./map-loading-fallback";

export const LazyParkBoundaryMap = dynamic(
  () => import("./park-boundary-map").then((mod) => mod.ParkBoundaryMap),
  {
    ssr: false,
    loading: MapLoadingFallback,
  },
);
