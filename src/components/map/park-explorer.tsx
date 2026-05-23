"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/cn";
import type { MapPark } from "@/lib/parks";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useHomeMapControls } from "../providers/home-map-controls-provider";
import { ParkMap } from "./park-map";

type MapFilter =
  | "all"
  | "national-park"
  | "state-hiking-area"
  | "wilderness-area"
  | "other-nature-reserve"
  | "outdoor-recreation-area"
  | "visited"
  | "not-visited";

interface ParkExplorerProps {
  parks: MapPark[];
  error?: string | null;
}

export const ParkExplorer = ({ parks, error }: ParkExplorerProps) => {
  const t = useTranslations("home.filters");
  const auth = useAuth();
  const [activeFilter, setActiveFilter] = useState<MapFilter>("all");
  const { isMobileFiltersOpen, closeMobileFilters, homeParkFocusRequest } = useHomeMapControls();

  const filterOptions = useMemo(() => {
    return [
      { id: "all", label: t("all") },
      { id: "national-park", label: t("nationalParks") },
      { id: "state-hiking-area", label: t("hikingAreas") },
      { id: "wilderness-area", label: t("wildernessAreas") },
      { id: "other-nature-reserve", label: t("otherNatureReserves") },
      { id: "outdoor-recreation-area", label: t("outdoorRecreationAreas") },
      { id: "visited", label: t("visited") },
      { id: "not-visited", label: t("notVisited") },
    ] satisfies Array<{ id: MapFilter; label: string }>;
  }, [t]);

  const filteredParks = useMemo(() => {
    switch (activeFilter) {
      case "national-park":
      case "state-hiking-area":
      case "wilderness-area":
      case "other-nature-reserve":
      case "outdoor-recreation-area":
        return parks.filter((park) => park.type.slug === activeFilter);
      case "visited":
        return parks.filter((park) => park.visitedSummary.visited);
      case "not-visited":
        return parks.filter((park) => !park.visitedSummary.visited);
      default:
        return parks;
    }
  }, [activeFilter, parks]);

  const selectFilter = (filter: MapFilter) => {
    setActiveFilter(filter);
    closeMobileFilters();
  };

  useEffect(() => {
    if (!homeParkFocusRequest) {
      return;
    }

    const focusedParkVisible = filteredParks.some(
      (park) => park.slug === homeParkFocusRequest.slug,
    );

    if (!focusedParkVisible) {
      setActiveFilter("all");
    }
  }, [filteredParks, homeParkFocusRequest]);

  const filterPanel = (
    <div className="pointer-events-auto flex flex-col gap-2 rounded-3xl border border-border/70 bg-background/95 p-3 shadow-lg backdrop-blur">
      {filterOptions.map((option) => (
        <Button
          key={option.id}
          type="button"
          variant={activeFilter === option.id ? "default" : "outline"}
          size="sm"
          onClick={() => selectFilter(option.id)}
          className={cn(
            "w-full justify-center rounded-2xl px-3 text-left",
            activeFilter !== option.id && "bg-background/70",
          )}
        >
          {option.label}
        </Button>
      ))}
      <span className="text-xs text-center text-muted-foreground">
        {t("results", { count: filteredParks.length })}
      </span>
    </div>
  );

  return (
    <div className="relative flex flex-1 min-h-0">
      <aside
        id="park-map-filters-mobile"
        className={cn(
          "pointer-events-none absolute left-4 z-10 w-40 md:top-4 md:block",
          isMobileFiltersOpen ? "top-2 block" : "hidden top-2",
        )}
      >
        {filterPanel}
      </aside>

      <ParkMap
        parks={filteredParks}
        error={error}
        canManageVisits={auth.isAuthenticated}
        homeParkFocusRequest={homeParkFocusRequest}
      />
    </div>
  );
};
