"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

interface TrailNavigation {
  request: { slug: string; sequence: number } | null;
  trailSlugs: string[];
  areaSlugs: string[];
  navigate: (slug: string) => void;
}
const ParkTrailNavigationContext = createContext<TrailNavigation | null>(null);

export const ParkTrailNavigationProvider = ({
  children,
  trailSlugs,
  areaSlugs = [],
}: {
  children: ReactNode;
  trailSlugs: string[];
  areaSlugs?: string[];
}) => {
  const [request, setRequest] = useState<TrailNavigation["request"]>(null);
  const navigate = (slug: string) => {
    setRequest((previous) => ({ slug, sequence: (previous?.sequence ?? 0) + 1 }));
    const url = new URL(window.location.href);
    url.searchParams.delete("visit");
    url.hash = "park-location";
    if (url.href !== window.location.href) {
      window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    const location = document.getElementById("park-location");
    location?.focus({ preventScroll: true });
    location?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  };
  return (
    <ParkTrailNavigationContext.Provider value={{ request, trailSlugs, areaSlugs, navigate }}>
      {children}
    </ParkTrailNavigationContext.Provider>
  );
};

export const useParkTrailNavigation = () => useContext(ParkTrailNavigationContext);
