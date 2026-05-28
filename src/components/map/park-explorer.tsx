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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHomeMapControls } from "../providers/home-map-controls-provider";
import { ParkMap } from "./park-map";

type ParkTypeFilter = ParkTypeSlug;
type MapFilter = "all" | ParkTypeFilter | "visited" | "not-visited" | "has-logo" | "has-map";

const FILTER_PANEL_CLASS_NAME =
  "pointer-events-auto flex flex-col gap-2 rounded-[2rem] border border-white/45 bg-white/60 p-3 shadow-[0_22px_48px_rgba(148,163,184,0.2)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50 dark:shadow-[0_26px_56px_rgba(2,6,23,0.38)]";
const FILTER_BUTTON_CLASS_NAME =
  "w-full justify-center rounded-2xl border px-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all hover:-translate-y-px";
const ACTIVE_FILTER_BUTTON_CLASS_NAME =
  "border-transparent bg-[linear-gradient(145deg,#166534_0%,#0f766e_55%,#2563eb_100%)] text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.24)] hover:brightness-105";
const INACTIVE_FILTER_BUTTON_CLASS_NAME =
  "border-sky-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(236,246,255,0.92))] text-cyan-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_10px_22px_rgba(148,163,184,0.14)] hover:border-sky-300/90 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(224,242,254,0.96))] dark:border-sky-300/15 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.84),rgba(15,32,59,0.76))] dark:text-sky-50 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_28px_rgba(2,6,23,0.28)] dark:hover:border-cyan-300/30 dark:hover:bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(18,47,84,0.86))]";

const isAreaPark = (park: MapPark) => park.type.slug !== "nature-trail";

const getFallbackFilterForFocusedPark = (park: MapPark): MapFilter =>
  isAreaPark(park) ? "all" : park.type.slug;

const isMapFilter = (value: string | null): value is MapFilter => {
  switch (value) {
    case "all":
    case "visited":
    case "not-visited":
    case "has-logo":
    case "has-map":
    case "national-park":
    case "state-hiking-area":
    case "wilderness-area":
    case "other-nature-reserve":
    case "outdoor-recreation-area":
    case "nature-trail":
      return true;
    default:
      return false;
  }
};

interface ParkExplorerProps {
  parks: MapPark[];
  error?: string | null;
}

export const ParkExplorer = ({ parks, error }: ParkExplorerProps) => {
  const t = useTranslations("home.filters");
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<MapFilter>("all");
  const [mapResetRequestId, setMapResetRequestId] = useState(0);
  const { isMobileFiltersOpen, closeMobileFilters, homeParkFocusRequest } = useHomeMapControls();
  const lastHandledFilterParamRef = useRef<string | null>(null);

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
      { id: "has-logo", label: t("hasLogo") },
      { id: "has-map", label: t("hasMap") },
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
      case "has-logo":
        return parks.filter((park) => park.logo !== null);
      case "has-map":
        return parks.filter((park) => park.map !== null);
      default:
        return parks;
    }
  }, [activeFilter, parks]);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const selectFilter = useCallback(
    (filter: MapFilter) => {
      setActiveFilter(filter);
      if (activeSlug === null) {
        setMapResetRequestId((current) => current + 1);
      }
      closeMobileFilters();
    },
    [activeSlug, closeMobileFilters],
  );

  useEffect(() => {
    const filterParam = pathname === "/parks" ? searchParams.get("filter") : null;

    if (!isMapFilter(filterParam)) {
      lastHandledFilterParamRef.current = null;
      return;
    }

    if (lastHandledFilterParamRef.current === filterParam) {
      return;
    }

    lastHandledFilterParamRef.current = filterParam;
    selectFilter(filterParam);

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete("filter");
    const nextSearch = nextSearchParams.toString();

    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, selectFilter]);

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
    <div className={FILTER_PANEL_CLASS_NAME} onMouseDown={(e) => e.stopPropagation()}>
      {filterOptions.map((option) => (
        <Button
          key={option.id}
          type="button"
          variant={activeFilter === option.id ? "default" : "outline"}
          size="sm"
          onClick={() => selectFilter(option.id)}
          className={cn(
            FILTER_BUTTON_CLASS_NAME,
            activeFilter === option.id
              ? ACTIVE_FILTER_BUTTON_CLASS_NAME
              : INACTIVE_FILTER_BUTTON_CLASS_NAME,
          )}
        >
          {option.label}
        </Button>
      ))}
      <span className="pt-1 text-center text-xs font-medium text-foreground/70 dark:text-sky-100/82">
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
        resetViewRequestId={mapResetRequestId}
        onActiveSlugChange={setActiveSlug}
      />
    </div>
  );
};
