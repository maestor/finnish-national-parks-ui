"use client";

import { SlidersHorizontal, X } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/cn";
import {
  type FilterableParkTypeSlug,
  HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG,
  isHikingAndWildernessAreaTypeSlug,
  PARK_TYPE_FILTER_LABEL_KEYS,
  type ParkTypeFilterLabelKey,
  TRAILS_AND_ROUTES_CATEGORY_SLUG,
} from "@/lib/park-type-filters";
import type { FilterableMapPark } from "@/lib/parks";
import { appRoutes, normalizeAppPath } from "@/lib/routes";
import { useHomeMapControls } from "../providers/home-map-controls-provider";
import { MAP_FLOATING_CONTROL_BUTTON_CLASS_NAME } from "./map-floating-control-styles";
import { MapLoadingFallback } from "./map-loading-fallback";

const ParkMap = dynamic(() => import("./park-map").then((mod) => mod.ParkMap), {
  ssr: false,
  loading: MapLoadingFallback,
});

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

const getFilteredParks = (
  parks: FilterableMapPark[],
  activeFilter: ParkTypeMapFilter,
  activeVisitStatus: VisitStatusFilter,
) => {
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
};

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
  const normalizedPathname = normalizeAppPath(pathname);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<ParkTypeMapFilter>("all");
  const [activeVisitStatus, setActiveVisitStatus] = useState<VisitStatusFilter>("visited");
  const [isVisitStatusSelectorOpen, setIsVisitStatusSelectorOpen] = useState(false);
  const [mapResetRequestId, setMapResetRequestId] = useState(0);
  const [mobileDraftFilter, setMobileDraftFilter] = useState<ParkTypeMapFilter>("all");
  const [mobileDraftVisitStatus, setMobileDraftVisitStatus] =
    useState<VisitStatusFilter>("visited");
  const [mobileFilterOpenState, setMobileFilterOpenState] = useState<{
    filter: ParkTypeMapFilter;
    visitStatus: VisitStatusFilter;
  } | null>(null);
  const { closeMobileFilters, isMobileFiltersOpen, homeParkFocusRequest, toggleMobileFilters } =
    useHomeMapControls();
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const lastHandledMapParamsRef = useRef<string | null>(null);
  const wasMobileFiltersOpenRef = useRef(isMobileFiltersOpen);

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
    return getFilteredParks(parks, activeFilter, activeVisitStatus);
  }, [activeFilter, activeVisitStatus, parks]);

  const filterSelection = isMobileFiltersOpen
    ? { filter: mobileDraftFilter, visitStatus: mobileDraftVisitStatus }
    : { filter: activeFilter, visitStatus: activeVisitStatus };

  const previewFilteredParks = useMemo(
    () => getFilteredParks(parks, filterSelection.filter, filterSelection.visitStatus),
    [filterSelection.filter, filterSelection.visitStatus, parks],
  );

  const requestMapReset = useCallback(() => {
    setMapResetRequestId((current) => current + 1);
  }, []);

  const applyFilters = useCallback(
    ({
      nextFilter = activeFilter,
      nextVisitStatus = activeVisitStatus,
      resetViewOnChange = false,
    }: {
      nextFilter?: ParkTypeMapFilter;
      nextVisitStatus?: VisitStatusFilter;
      resetViewOnChange?: boolean;
    }) => {
      const hasChanged = nextFilter !== activeFilter || nextVisitStatus !== activeVisitStatus;

      if (!hasChanged) {
        return;
      }

      setActiveFilter(nextFilter);
      setActiveVisitStatus(nextVisitStatus);

      if (resetViewOnChange) {
        requestMapReset();
      }
    },
    [activeFilter, activeVisitStatus, requestMapReset],
  );

  const selectFilter = useCallback(
    (filter: ParkTypeMapFilter) => {
      setIsVisitStatusSelectorOpen(false);
      if (isMobileFiltersOpen) {
        setMobileDraftFilter(filter);
        return;
      }

      if (filter === activeFilter) {
        requestMapReset();
        return;
      }

      applyFilters({ nextFilter: filter });
    },
    [activeFilter, applyFilters, isMobileFiltersOpen, requestMapReset],
  );

  const selectVisitStatus = useCallback(
    (visitStatus: VisitStatusFilter) => {
      setIsVisitStatusSelectorOpen(false);
      if (isMobileFiltersOpen) {
        setMobileDraftVisitStatus(visitStatus);
        return;
      }

      applyFilters({ nextVisitStatus: visitStatus });
    },
    [applyFilters, isMobileFiltersOpen],
  );

  useEffect(() => {
    const filterParam = normalizedPathname === appRoutes.parks ? searchParams.get("filter") : null;
    const visitStatusParam =
      normalizedPathname === appRoutes.parks ? searchParams.get("visitStatus") : null;
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
      resetViewOnChange: true,
    });

    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (normalizedFilter !== null || isVisitStatusFilter(filterParam)) {
      nextSearchParams.delete("filter");
    }

    if (isVisitStatusFilter(visitStatusParam)) {
      nextSearchParams.delete("visitStatus");
    }

    const nextSearch = nextSearchParams.toString();

    router.replace(nextSearch ? `${appRoutes.parks}?${nextSearch}` : appRoutes.parks, {
      scroll: false,
    });
  }, [activeFilter, activeVisitStatus, applyFilters, normalizedPathname, router, searchParams]);

  useEffect(() => {
    const filterPanelElement = filterPanelRef.current;

    if (!filterPanelElement) {
      return;
    }

    // Keep map drag gestures from starting when the user presses inside the overlay.
    const stopPointerPropagation = (event: Event) => {
      event.stopPropagation();
    };

    filterPanelElement.addEventListener("mousedown", stopPointerPropagation, true);
    filterPanelElement.addEventListener("pointerdown", stopPointerPropagation, true);

    return () => {
      filterPanelElement.removeEventListener("mousedown", stopPointerPropagation, true);
      filterPanelElement.removeEventListener("pointerdown", stopPointerPropagation, true);
    };
  }, []);

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

  useEffect(() => {
    if (!wasMobileFiltersOpenRef.current && isMobileFiltersOpen) {
      setMobileDraftFilter(activeFilter);
      setMobileDraftVisitStatus(activeVisitStatus);
      setMobileFilterOpenState({
        filter: activeFilter,
        visitStatus: activeVisitStatus,
      });
      setIsVisitStatusSelectorOpen(false);
    }

    if (wasMobileFiltersOpenRef.current && !isMobileFiltersOpen) {
      setMobileFilterOpenState(null);
      setIsVisitStatusSelectorOpen(false);
    }

    wasMobileFiltersOpenRef.current = isMobileFiltersOpen;
  }, [activeFilter, activeVisitStatus, isMobileFiltersOpen]);

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
    visitStatusOptions.find((option) => option.id === filterSelection.visitStatus) ??
    visitStatusOptions[0];
  const inactiveVisitStatusOptions = visitStatusOptions.filter(
    (option) => option.id !== filterSelection.visitStatus,
  );

  const hasPendingMobileFilterChanges =
    !!mobileFilterOpenState &&
    (mobileDraftFilter !== mobileFilterOpenState.filter ||
      mobileDraftVisitStatus !== mobileFilterOpenState.visitStatus);

  const handleMobileFilterAction = useCallback(() => {
    setIsVisitStatusSelectorOpen(false);

    if (!hasPendingMobileFilterChanges) {
      closeMobileFilters();
      return;
    }

    applyFilters({
      nextFilter: mobileDraftFilter,
      nextVisitStatus: mobileDraftVisitStatus,
      resetViewOnChange: true,
    });
    closeMobileFilters();
  }, [
    applyFilters,
    closeMobileFilters,
    hasPendingMobileFilterChanges,
    mobileDraftFilter,
    mobileDraftVisitStatus,
  ]);

  const visitStatusListId = "park-map-visit-status-options";

  const filterPanel = (
    <div ref={filterPanelRef} className={FILTER_PANEL_CLASS_NAME}>
      {filterOptions.map((option) => (
        <Button
          key={option.id}
          type="button"
          variant={filterSelection.filter === option.id ? "default" : "outline"}
          size="sm"
          onClick={() => selectFilter(option.id)}
          className={cn(
            FILTER_BUTTON_CLASS_NAME,
            filterSelection.filter === option.id
              ? ACTIVE_FILTER_BUTTON_CLASS_NAME
              : INACTIVE_FILTER_BUTTON_CLASS_NAME,
          )}
        >
          {option.label}
        </Button>
      ))}
      <fieldset className="mt-1 rounded-3xl border border-white/45 bg-white/56 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/10 dark:bg-slate-950/42 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
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
        {!!isVisitStatusSelectorOpen && (
          <div id={visitStatusListId} className="mt-2 space-y-1">
            {inactiveVisitStatusOptions.map((option) => (
              <Button
                key={option.id}
                type="button"
                variant={filterSelection.visitStatus === option.id ? "default" : "outline"}
                size="sm"
                aria-pressed={filterSelection.visitStatus === option.id}
                onClick={() => selectVisitStatus(option.id)}
                className={cn(
                  FILTER_BUTTON_CLASS_NAME,
                  "min-h-10 rounded-[1.2rem]",
                  filterSelection.visitStatus === option.id
                    ? ACTIVE_FILTER_BUTTON_CLASS_NAME
                    : INACTIVE_FILTER_BUTTON_CLASS_NAME,
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        )}
      </fieldset>
      {isMobileFiltersOpen ? (
        <Button
          type="button"
          variant={hasPendingMobileFilterChanges ? "default" : "outline"}
          size="sm"
          onClick={handleMobileFilterAction}
          className={cn(
            FILTER_BUTTON_CLASS_NAME,
            "rounded-[1.2rem]",
            hasPendingMobileFilterChanges
              ? ACTIVE_FILTER_BUTTON_CLASS_NAME
              : INACTIVE_FILTER_BUTTON_CLASS_NAME,
          )}
        >
          {hasPendingMobileFilterChanges ? t("saveAndClose") : t("close")}
        </Button>
      ) : null}
      <span className="pt-1 text-center text-xs font-medium text-foreground/70 dark:text-sky-100/82">
        {t("results", { count: previewFilteredParks.length })}
      </span>
    </div>
  );

  return (
    <div className="relative flex flex-1 min-h-0">
      <aside
        id="park-map-filters-mobile"
        aria-label={t("panelLabel")}
        className={cn(
          "pointer-events-none absolute left-4 w-40 md:top-4 md:block",
          isMobileFiltersOpen ? "top-2 z-30 block md:z-10" : "hidden top-2 z-10",
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
        floatingControls={
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleMobileFilters}
            className={cn(MAP_FLOATING_CONTROL_BUTTON_CLASS_NAME, "md:hidden")}
            aria-label={t("panelLabel")}
            aria-expanded={isMobileFiltersOpen}
            aria-controls="park-map-filters-mobile"
            title={t("panelLabel")}
          >
            {isMobileFiltersOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        }
      />
    </div>
  );
};
