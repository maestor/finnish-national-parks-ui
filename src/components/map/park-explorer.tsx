"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/cn";
import {
  PARK_TYPE_FILTER_LABEL_KEYS,
  type ParkTypeFilterLabelKey,
  type ParkTypeSlug,
} from "@/lib/park-type-filters";
import type { MapPark } from "@/lib/parks";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useHomeMapControls } from "../providers/home-map-controls-provider";
import { ParkMap } from "./park-map";

type ParkTypeFilter = ParkTypeSlug;
type MapFilter = "all" | ParkTypeFilter | "visited" | "not-visited";

const isAreaPark = (park: MapPark) => park.type.slug !== "nature-trail";

const getFallbackFilterForFocusedPark = (park: MapPark): MapFilter =>
  isAreaPark(park) ? "all" : park.type.slug;

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
    const parkTypeFilterOptions = (
      Object.entries(PARK_TYPE_FILTER_LABEL_KEYS) as Array<[ParkTypeFilter, ParkTypeFilterLabelKey]>
    ).map(([id, labelKey]) => ({
      id,
      label: t(labelKey),
    }));

    return [
      { id: "all", label: t("all") },
      ...parkTypeFilterOptions,
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
      case "nature-trail":
        return parks.filter((park) => park.type.slug === activeFilter);
      case "visited":
        return parks.filter((park) => park.visitedSummary.visited);
      case "not-visited":
        return parks.filter((park) => !park.visitedSummary.visited);
      default:
        return parks.filter(isAreaPark);
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
      const focusedPark = parks.find((park) => park.slug === homeParkFocusRequest.slug);

      setActiveFilter(focusedPark ? getFallbackFilterForFocusedPark(focusedPark) : "all");
    }
  }, [filteredParks, homeParkFocusRequest, parks]);

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
