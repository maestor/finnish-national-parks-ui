"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

interface TrailNavigation {
  request: { slug: string; sequence: number } | null;
  trailSlugs: string[];
  navigate: (slug: string) => void;
}
const ParkTrailNavigationContext = createContext<TrailNavigation | null>(null);

export const ParkTrailNavigationProvider = ({
  children,
  trailSlugs,
}: {
  children: ReactNode;
  trailSlugs: string[];
}) => {
  const [request, setRequest] = useState<TrailNavigation["request"]>(null);
  const navigate = (slug: string) => {
    setRequest((previous) => ({ slug, sequence: (previous?.sequence ?? 0) + 1 }));
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
    <ParkTrailNavigationContext.Provider value={{ request, trailSlugs, navigate }}>
      {children}
    </ParkTrailNavigationContext.Provider>
  );
};

export const useParkTrailNavigation = () => useContext(ParkTrailNavigationContext);
