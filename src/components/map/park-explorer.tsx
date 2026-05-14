"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { MapPark } from "@/lib/parks";
import { SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { ParkMap } from "./park-map";

type MapFilter =
  | "all"
  | "national-park"
  | "state-hiking-area"
  | "wilderness-area"
  | "visited"
  | "not-visited";

interface ParkExplorerProps {
  parks: MapPark[];
  error?: string | null;
  isAuthenticated?: boolean;
}

export const ParkExplorer = ({ parks, error, isAuthenticated = false }: ParkExplorerProps) => {
  const t = useTranslations("home.filters");
  const [activeFilter, setActiveFilter] = useState<MapFilter>("all");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const filterOptions = useMemo(() => {
    const options: Array<{ id: MapFilter; label: string }> = [
      { id: "all", label: t("all") },
      { id: "national-park", label: t("nationalParks") },
      { id: "state-hiking-area", label: t("hikingAreas") },
      { id: "wilderness-area", label: t("wildernessAreas") },
    ];

    if (isAuthenticated) {
      options.push(
        { id: "visited", label: t("visited") },
        { id: "not-visited", label: t("notVisited") },
      );
    }

    return options;
  }, [isAuthenticated, t]);

  const filteredParks = useMemo(() => {
    switch (activeFilter) {
      case "national-park":
      case "state-hiking-area":
      case "wilderness-area":
        return parks.filter((park) => park.type.slug === activeFilter);
      case "visited":
        return parks.filter((park) => park.visitedSummary?.visited);
      case "not-visited":
        return parks.filter((park) => !park.visitedSummary?.visited);
      default:
        return parks;
    }
  }, [activeFilter, parks]);

  const selectFilter = (filter: MapFilter) => {
    setActiveFilter(filter);
    setIsMobileFiltersOpen(false);
  };

  return (
    <div className="relative flex flex-1 min-h-0">
      <div className="pointer-events-none absolute inset-x-4 top-2 z-10 md:hidden">
        <div className="pointer-events-auto flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsMobileFiltersOpen((current) => !current)}
            className="rounded-full bg-background/90 shadow-lg backdrop-blur"
            aria-expanded={isMobileFiltersOpen}
            aria-controls="park-map-filters-mobile"
          >
            {isMobileFiltersOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            )}
            {t("toggle")}
          </Button>
        </div>

        {isMobileFiltersOpen ? (
          <div
            id="park-map-filters-mobile"
            className="mt-2 rounded-2xl border border-border/70 bg-background/90 p-2 shadow-lg backdrop-blur"
          >
            <div className="flex flex-wrap items-center gap-2">
              {filterOptions.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant={activeFilter === option.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => selectFilter(option.id)}
                  className={cn(
                    "rounded-full px-3",
                    activeFilter !== option.id && "bg-background/70",
                  )}
                >
                  {option.label}
                </Button>
              ))}
              <span className="basis-full text-xs text-muted-foreground">
                {t("results", { count: filteredParks.length })}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute left-6 right-20 top-2 z-10 hidden md:block md:left-8 md:right-24">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-background/90 p-2 shadow-lg backdrop-blur">
          {filterOptions.map((option) => (
            <Button
              key={option.id}
              type="button"
              variant={activeFilter === option.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(option.id)}
              className={cn("rounded-full px-3", activeFilter !== option.id && "bg-background/70")}
            >
              {option.label}
            </Button>
          ))}
          <span className="basis-full text-xs text-muted-foreground sm:ml-auto sm:basis-auto">
            {t("results", { count: filteredParks.length })}
          </span>
        </div>
      </div>

      <ParkMap parks={filteredParks} error={error} isAuthenticated={isAuthenticated} />
    </div>
  );
};
