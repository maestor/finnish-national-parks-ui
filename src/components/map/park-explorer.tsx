"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/cn";
import {
  type FilterableParkTypeSlug,
  HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG,
  PARK_TYPE_FILTER_LABEL_KEYS,
  type ParkTypeFilterLabelKey,
  TRAILS_AND_ROUTES_CATEGORY_SLUG,
  isHikingAndWildernessAreaTypeSlug,
} from "@/lib/park-type-filters";
import type { FilterableMapPark } from "@/lib/parks";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHomeMapControls } from "../providers/home-map-controls-provider";
import { ParkMap } from "./park-map";

type VisitStatusFilter = "all" | "visited" | "not-visited";

type ParkTypeMapFilter =
  | "all"
  | "areas"
  | typeof HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG
  | typeof TRAILS_AND_ROUTES_CATEGORY_SLUG
  | FilterableParkTypeSlug;

const FILTER_PANEL_CLASS_NAME =
  "pointer-events-auto flex flex-col gap-2 rounded-[2rem] border border-white/45 bg-white/60 p-3 shadow-[0_22px_48px_rgba(148,163,184,0.2)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50 dark:shadow-[0_26px_56px_rgba(2,6,23,0.38)]";
const FILTER_BUTTON_CLASS_NAME =
  "w-full justify-center rounded-2xl border px-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all hover:-translate-y-px";
const ACTIVE_FILTER_BUTTON_CLASS_NAME =
  "border-transparent bg-[linear-gradient(145deg,#166534_0%,#0f766e_55%,#2563eb_100%)] text-primary-foreground shadow-[0_14px_28px_rgba(37,99,235,0.24)] hover:brightness-105";
const INACTIVE_FILTER_BUTTON_CLASS_NAME =
  "border-sky-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(236,246,255,0.92))] text-cyan-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_10px_22px_rgba(148,163,184,0.14)] hover:border-sky-300/90 hover:bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(224,242,254,0.96))] dark:border-sky-300/15 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.84),rgba(15,32,59,0.76))] dark:text-sky-50 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_28px_rgba(2,6,23,0.28)] dark:hover:border-cyan-300/30 dark:hover:bg-[linear-gradient(135deg,rgba(15,23,42,0.94),rgba(18,47,84,0.86))]";

const isTrailPark = (park: FilterableMapPark) =>
  park.category.slug === TRAILS_AND_ROUTES_CATEGORY_SLUG;
const isHikingAndWildernessPark = (park: FilterableMapPark) =>
  park.category.slug === HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG;

const isAreaPark = (park: FilterableMapPark) => !isTrailPark(park);

const getFallbackFilterForFocusedPark = (park: FilterableMapPark): ParkTypeMapFilter =>
  isTrailPark(park)
    ? TRAILS_AND_ROUTES_CATEGORY_SLUG
    : isHikingAndWildernessPark(park)
      ? HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG
      : "areas";

const getVisitStatusFilterForPark = (park: FilterableMapPark): VisitStatusFilter =>
  park.visitedSummary.visited ? "visited" : "not-visited";

type LegacyMapFilter =
  | Extract<FilterableMapPark["type"]["slug"], "hiking-area" | "wilderness-area">
  | "factory-village";

type AcceptedMapFilter = ParkTypeMapFilter | LegacyMapFilter;

const isMapFilter = (value: string | null): value is AcceptedMapFilter => {
  switch (value) {
    case "all":
    case "areas":
    case HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG:
    case TRAILS_AND_ROUTES_CATEGORY_SLUG:
    case "national-park":
    case "hiking-area":
    case "wilderness-area":
    case "nature-reserve-area":
    case "outdoor-recreation-area":
    case "cultural-history-area":
    case "factory-village":
      return true;
    default:
      return false;
  }
};

const isVisitStatusFilter = (value: string | null): value is VisitStatusFilter =>
  value === "all" || value === "visited" || value === "not-visited";

const normalizeMapFilter = (filter: AcceptedMapFilter): ParkTypeMapFilter => {
  if (filter === "factory-village") {
    return "cultural-history-area";
  }

  return isHikingAndWildernessAreaTypeSlug(filter)
    ? HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG
    : filter;
};

interface ParkExplorerProps {
  parks: FilterableMapPark[];
  error?: string | null;
}

export const ParkExplorer = ({ parks, error }: ParkExplorerProps) => {
  const t = useTranslations("home.filters");
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<ParkTypeMapFilter>("all");
  const [activeVisitStatus, setActiveVisitStatus] = useState<VisitStatusFilter>("visited");
  const [isVisitStatusSelectorOpen, setIsVisitStatusSelectorOpen] = useState(false);
  const [mapResetRequestId, setMapResetRequestId] = useState(0);
  const { isMobileFiltersOpen, closeMobileFilters, homeParkFocusRequest } = useHomeMapControls();
  const lastHandledMapParamsRef = useRef<string | null>(null);

  const filterOptions = useMemo(() => {
    const parkTypeFilterOptionsById = new Map(
      Object.entries(PARK_TYPE_FILTER_LABEL_KEYS) as Array<
        [FilterableParkTypeSlug, ParkTypeFilterLabelKey]
      >,
    );

    return [
      { id: "all", label: t("all") },
      { id: "areas", label: t("areas") },
      {
        id: "national-park",
        label: t(parkTypeFilterOptionsById.get("national-park") ?? "nationalParks"),
      },
      {
        id: HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG,
        label: t("hikingAndWildernessAreas"),
      },
      {
        id: "nature-reserve-area",
        label: t(parkTypeFilterOptionsById.get("nature-reserve-area") ?? "otherNatureReserves"),
      },
      {
        id: "outdoor-recreation-area",
        label: t(
          parkTypeFilterOptionsById.get("outdoor-recreation-area") ?? "outdoorRecreationAreas",
        ),
      },
      {
        id: "cultural-history-area",
        label: t(parkTypeFilterOptionsById.get("cultural-history-area") ?? "culturalHistoryAreas"),
      },
      { id: TRAILS_AND_ROUTES_CATEGORY_SLUG, label: t("natureTrails") },
    ] satisfies Array<{ id: ParkTypeMapFilter; label: string }>;
  }, [t]);

  const filteredParks = useMemo(() => {
    const parksWithSelectedVisitStatus =
      activeVisitStatus === "all"
        ? parks
        : parks.filter((park) =>
            activeVisitStatus === "visited"
              ? park.visitedSummary.visited
              : !park.visitedSummary.visited,
          );

    switch (activeFilter) {
      case "all":
        return parksWithSelectedVisitStatus;
      case "areas":
        return parksWithSelectedVisitStatus.filter((park) => isAreaPark(park));
      case HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG:
        return parksWithSelectedVisitStatus.filter((park) => isHikingAndWildernessPark(park));
      case TRAILS_AND_ROUTES_CATEGORY_SLUG:
        return parksWithSelectedVisitStatus.filter((park) => isTrailPark(park));
      case "national-park":
      case "nature-reserve-area":
      case "outdoor-recreation-area":
      case "cultural-history-area":
        return parksWithSelectedVisitStatus.filter((park) => park.type.slug === activeFilter);
      default:
        return parksWithSelectedVisitStatus;
    }
  }, [activeFilter, activeVisitStatus, parks]);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const applyFilters = useCallback(
    ({
      nextFilter = activeFilter,
      nextVisitStatus = activeVisitStatus,
    }: {
      nextFilter?: ParkTypeMapFilter;
      nextVisitStatus?: VisitStatusFilter;
    }) => {
      const hasChanged = nextFilter !== activeFilter || nextVisitStatus !== activeVisitStatus;

      if (!hasChanged) {
        closeMobileFilters();
        return;
      }

      setActiveFilter(nextFilter);
      setActiveVisitStatus(nextVisitStatus);

      if (activeSlug === null) {
        setMapResetRequestId((current) => current + 1);
      }

      closeMobileFilters();
    },
    [activeFilter, activeSlug, activeVisitStatus, closeMobileFilters],
  );

  const selectFilter = useCallback(
    (filter: ParkTypeMapFilter) => {
      setIsVisitStatusSelectorOpen(false);
      applyFilters({ nextFilter: filter });
    },
    [applyFilters],
  );

  const selectVisitStatus = useCallback(
    (visitStatus: VisitStatusFilter) => {
      setIsVisitStatusSelectorOpen(false);
      applyFilters({ nextVisitStatus: visitStatus });
    },
    [applyFilters],
  );

  useEffect(() => {
    const filterParam = pathname === "/parks" ? searchParams.get("filter") : null;
    const visitStatusParam = pathname === "/parks" ? searchParams.get("visitStatus") : null;
    const normalizedFilter = isMapFilter(filterParam) ? normalizeMapFilter(filterParam) : null;
    const normalizedVisitStatus = isVisitStatusFilter(visitStatusParam)
      ? visitStatusParam
      : isVisitStatusFilter(filterParam)
        ? filterParam
        : null;

    if (normalizedFilter === null && normalizedVisitStatus === null) {
      lastHandledMapParamsRef.current = null;
      return;
    }

    const handledParamsKey = `${filterParam ?? ""}|${visitStatusParam ?? ""}`;

    if (lastHandledMapParamsRef.current === handledParamsKey) {
      return;
    }

    lastHandledMapParamsRef.current = handledParamsKey;

    applyFilters({
      nextFilter: normalizedFilter ?? activeFilter,
      nextVisitStatus: normalizedVisitStatus ?? activeVisitStatus,
    });

    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (normalizedFilter !== null || isVisitStatusFilter(filterParam)) {
      nextSearchParams.delete("filter");
    }

    if (isVisitStatusFilter(visitStatusParam)) {
      nextSearchParams.delete("visitStatus");
    }

    const nextSearch = nextSearchParams.toString();

    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
  }, [activeFilter, activeVisitStatus, applyFilters, pathname, router, searchParams]);

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
      setActiveVisitStatus(focusedPark ? getVisitStatusFilterForPark(focusedPark) : "visited");
    }
  }, [filteredParks, homeParkFocusRequest, parks]);

  const visitStatusOptions = useMemo(
    () =>
      [
        { id: "visited", label: t("visited") },
        { id: "not-visited", label: t("notVisited") },
        { id: "all", label: t("visitStatusAll") },
      ] as const satisfies Array<{ id: VisitStatusFilter; label: string }>,
    [t],
  );

  const activeVisitStatusOption =
    visitStatusOptions.find((option) => option.id === activeVisitStatus) ?? visitStatusOptions[0];

  const visitStatusListId = "park-map-visit-status-options";

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
      <fieldset className="mt-1 rounded-[1.5rem] border border-white/45 bg-white/56 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/10 dark:bg-slate-950/42 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <legend className="mx-auto rounded-full border border-white/60 bg-white/88 px-3 py-1 text-center text-[0.7rem] font-semibold tracking-[0.18em] text-slate-700 uppercase shadow-[0_10px_20px_rgba(148,163,184,0.14)] dark:border-white/12 dark:bg-slate-900/88 dark:text-sky-100 dark:shadow-[0_14px_24px_rgba(2,6,23,0.24)]">
          {t("visitStatusLabel")}
        </legend>
        <Button
          type="button"
          variant="default"
          size="sm"
          aria-expanded={isVisitStatusSelectorOpen}
          aria-controls={visitStatusListId}
          onClick={() => setIsVisitStatusSelectorOpen((current) => !current)}
          className={cn(
            FILTER_BUTTON_CLASS_NAME,
            ACTIVE_FILTER_BUTTON_CLASS_NAME,
            "mt-1 min-h-11 rounded-[1.25rem] px-4 text-left",
          )}
        >
          <span className="block w-full text-center">{activeVisitStatusOption.label}</span>
        </Button>
        {isVisitStatusSelectorOpen ? (
          <div id={visitStatusListId} className="mt-2 space-y-1" aria-label={t("visitStatusLabel")}>
            {visitStatusOptions.map((option) => (
              <Button
                key={option.id}
                type="button"
                variant={activeVisitStatus === option.id ? "default" : "outline"}
                size="sm"
                aria-pressed={activeVisitStatus === option.id}
                onClick={() => selectVisitStatus(option.id)}
                className={cn(
                  FILTER_BUTTON_CLASS_NAME,
                  "min-h-10 rounded-[1.2rem]",
                  activeVisitStatus === option.id
                    ? ACTIVE_FILTER_BUTTON_CLASS_NAME
                    : INACTIVE_FILTER_BUTTON_CLASS_NAME,
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        ) : null}
      </fieldset>
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
