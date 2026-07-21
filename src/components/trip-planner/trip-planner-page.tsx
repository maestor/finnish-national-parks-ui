"use client";

import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  LocateFixed,
  Route,
  SlidersHorizontal,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PUBLIC_EYEBROW_BADGE_CLASS_NAME,
  PUBLIC_HERO_DESCRIPTION_CLASS_NAME,
  PUBLIC_HERO_HEADING_STACK_CLASS_NAME,
  PUBLIC_HERO_TITLE_CLASS_NAME,
  PUBLIC_PAGE_SHELL_CLASS_NAME,
  PUBLIC_PANEL_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import {
  type FilterableParkTypeSlug,
  HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG,
  PARK_TYPE_FILTER_LABEL_KEYS,
  type ParkTypeFilterLabelKey,
  TRAILS_AND_ROUTES_CATEGORY_SLUG,
} from "@/lib/park-type-filters";
import { getParkTypeDisplayName } from "@/lib/parks";
import { appRoutes } from "@/lib/routes";
import {
  fetchTripPlannerSuggestions,
  normalizeTripPlannerNearbyResponse,
  normalizeTripPlannerSearchResponse,
  searchTripPlanner,
  searchTripPlannerNearby,
  type TripPlannerResolvedLocation,
  type TripPlannerSuggestion,
  type TripPlannerUiParkResult,
  type TripPlannerUiResult,
} from "@/lib/trip-planner";
import { MapLoadingFallback } from "../map/map-loading-fallback";

const TripPlannerMap = dynamic(
  () => import("./trip-planner-map").then((mod) => mod.TripPlannerMap),
  {
    ssr: false,
    loading: MapLoadingFallback,
  },
);

const INPUT_CLASS_NAME =
  "flex h-11 w-full rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";
const INLINE_SELECT_CLASS_NAME = cn(
  INPUT_CLASS_NAME,
  "h-10 rounded-lg px-3 py-2 pr-11 text-sm appearance-none md:min-w-44",
);
const INLINE_SLIDER_CLASS_NAME =
  "relative -top-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-sky-100 accent-primary dark:bg-slate-800";
const FILTER_GROUP_CLASS_NAME = "flex min-w-0 flex-col gap-1";
const DEFAULT_DISTANCE_FILTER_KM = 25;
const DEFAULT_VISIT_STATUS_FILTER: VisitStatusFilter = "not-visited";
const MIN_DISTANCE_FILTER_KM = 1;
const FILTER_VISIBILITY_THRESHOLD = 20;
const MOBILE_RESULTS_FILTER_MEDIA_QUERY = "(max-width: 767px)";
const MIN_SUGGESTION_QUERY_LENGTH = 2;
const SUGGESTION_DEBOUNCE_MS = 250;
const LOCATION_REQUEST_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 300000,
  timeout: 10000,
} as const;
const SUGGESTION_LIST_CLASS_NAME =
  "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[1.35rem] border border-white/55 bg-white/96 shadow-[0_20px_40px_rgba(148,163,184,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/94 dark:shadow-[0_24px_48px_rgba(2,6,23,0.42)]";
const SUGGESTION_OPTION_CLASS_NAME =
  "cursor-pointer px-3 py-2 text-sm text-foreground transition-colors hover:bg-white/82 dark:hover:bg-slate-900/82";
const RESULTS_LOADING_PLACEHOLDER_CLASS_NAME =
  "overflow-hidden rounded-2xl border border-white/45 bg-white/68 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/10 dark:bg-slate-950/44 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";
const RESULTS_LOADING_BAR_CLASS_NAME =
  "rounded-full bg-white/78 motion-safe:animate-pulse dark:bg-slate-800/88";

const DISTANCE_FORMATTER = new Intl.NumberFormat("fi-FI", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const DURATION_FORMATTER = new Intl.NumberFormat("fi-FI", {
  maximumFractionDigits: 0,
});

type SearchState = "idle" | "loading" | "success" | "error";
type TripPlannerMode = TripPlannerUiResult["mode"];
type VisitStatusFilter = "all" | "visited" | "not-visited";
type UserLocationStatus =
  | "idle"
  | "locating"
  | "unsupported"
  | "permissionDenied"
  | "unavailable"
  | "timeout";
type UserLocationStatusMessageKey =
  | "locationLocating"
  | "locationUnsupported"
  | "locationPermissionDenied"
  | "locationTimeout"
  | "locationUnavailable";
type ViewTab = "list" | "map";
type TripPlannerParkTypeFilter =
  | "all"
  | "areas"
  | typeof HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG
  | typeof TRAILS_AND_ROUTES_CATEGORY_SLUG
  | FilterableParkTypeSlug;

const isTrailPark = (park: TripPlannerUiParkResult) =>
  park.category.slug === TRAILS_AND_ROUTES_CATEGORY_SLUG;

const isHikingAndWildernessPark = (park: TripPlannerUiParkResult) =>
  park.category.slug === HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG;

const isAreaPark = (park: TripPlannerUiParkResult) => !isTrailPark(park);

const formatDistance = (distanceKm: number) => `${DISTANCE_FORMATTER.format(distanceKm)} km`;

const formatRouteDistance = (distanceMeters: number) => `${Math.round(distanceMeters / 1000)} km`;

const formatRouteDuration = (durationSeconds: number) => {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.round((durationSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} h ${DURATION_FORMATTER.format(minutes)} min`;
  }

  return `${DURATION_FORMATTER.format(minutes)} min`;
};

const splitTripPlannerResults = (parks: TripPlannerUiParkResult[]) => {
  return parks.reduce(
    (groups, park) => {
      if (park.visitedSummary.visited) {
        groups.visited.push(park);
      } else {
        groups.notVisited.push(park);
      }

      return groups;
    },
    { visited: [] as TripPlannerUiParkResult[], notVisited: [] as TripPlannerUiParkResult[] },
  );
};

const TripPlannerResultsLoadingState = ({ loadingLabel }: { loadingLabel: string }) => {
  return (
    <div className="space-y-5" aria-live="polite" aria-busy="true">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className={cn(RESULTS_LOADING_BAR_CLASS_NAME, "h-4 w-40 max-w-full")} />
            <div className={cn(RESULTS_LOADING_BAR_CLASS_NAME, "h-4 w-32 max-w-full")} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className={cn(RESULTS_LOADING_BAR_CLASS_NAME, "h-10 w-full")} />
            <div className={cn(RESULTS_LOADING_BAR_CLASS_NAME, "h-10 w-full")} />
            <div className={cn(RESULTS_LOADING_BAR_CLASS_NAME, "h-10 w-full")} />
          </div>
        </div>

        <div className={cn(RESULTS_LOADING_PLACEHOLDER_CLASS_NAME, "w-full max-w-xs space-y-3")}>
          <div className={cn(RESULTS_LOADING_BAR_CLASS_NAME, "h-4 w-28")} />
          <div className={cn(RESULTS_LOADING_BAR_CLASS_NAME, "h-4 w-32")} />
          <div className={cn(RESULTS_LOADING_BAR_CLASS_NAME, "h-4 w-24")} />
        </div>
      </div>

      <div className={cn(RESULTS_LOADING_PLACEHOLDER_CLASS_NAME, "space-y-4")}>
        <p className="text-sm font-medium text-foreground">{loadingLabel}</p>
        <div className={cn(RESULTS_LOADING_BAR_CLASS_NAME, "h-48 w-full rounded-[1.5rem]")} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className={cn(RESULTS_LOADING_BAR_CLASS_NAME, "h-20 w-full rounded-[1.25rem]")} />
          <div className={cn(RESULTS_LOADING_BAR_CLASS_NAME, "h-20 w-full rounded-[1.25rem]")} />
        </div>
      </div>
    </div>
  );
};

const normalizeSuggestionQuery = (query: string) => query.trim().replaceAll(/\s+/g, " ");

const getSuggestionQueryKey = (query: string) =>
  normalizeSuggestionQuery(query).toLocaleLowerCase("fi-FI");

const getUserLocationStatusFromError = (
  error: GeolocationPositionError,
): Exclude<UserLocationStatus, "idle" | "locating" | "unsupported"> => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "permissionDenied";
    case error.POSITION_UNAVAILABLE:
      return "unavailable";
    case error.TIMEOUT:
      return "timeout";
    default:
      return "unavailable";
  }
};

const getUserLocationStatusMessage = (
  status: UserLocationStatus,
  t: (key: UserLocationStatusMessageKey) => string,
) => {
  switch (status) {
    case "idle":
      return null;
    case "locating":
      return t("locationLocating");
    case "unsupported":
      return t("locationUnsupported");
    case "permissionDenied":
      return t("locationPermissionDenied");
    case "timeout":
      return t("locationTimeout");
    case "unavailable":
      return t("locationUnavailable");
  }
};

const formatCoordinateQuery = (coordinate: { lat: number; lon: number }) =>
  `${coordinate.lat.toFixed(6)},${coordinate.lon.toFixed(6)}`;

const getTripPlannerSuggestionKey = ({ coordinate, label }: TripPlannerSuggestion) =>
  `${label}-${formatCoordinateQuery(coordinate)}`;

const renderMultilineText = (text: string) => {
  let offset = 0;

  return text.split("\n").map((line) => {
    const key = `${offset}-${line}`;
    const shouldInsertBreak = offset > 0;
    offset += line.length + 1;

    return (
      <span key={key}>
        {shouldInsertBreak ? <br /> : null}
        {line}
      </span>
    );
  });
};

const removeTrailingColon = (label: string) => label.replace(/:\s*$/, "");

const TripPlannerRouteSummaryValue = ({ label, value }: { label: string; value: string }) => (
  <output aria-label={`${label} ${value}`} title={label} className="text-muted-foreground">
    {value}
  </output>
);

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQueryList.matches);

    updateMatches();
    mediaQueryList.addEventListener("change", updateMatches);

    return () => {
      mediaQueryList.removeEventListener("change", updateMatches);
    };
  }, [query]);

  return matches;
};

type TripPlannerSuggestionInputProps = {
  assistiveMessage?: string;
  assistiveMessageTone?: "default" | "error";
  errorMessage?: string;
  id: string;
  label: ReactNode;
  name: string;
  onLocate?: () => void;
  placeholder: string;
  locateButtonLabel?: string;
  isLocating?: boolean;
  required: boolean;
  selectedLocation: TripPlannerResolvedLocation | null;
  value: string;
  onSelectedLocationChange: (location: TripPlannerResolvedLocation | null) => void;
  onValueChange: (value: string) => void;
};

const TripPlannerSuggestionInput = ({
  assistiveMessage,
  assistiveMessageTone = "default",
  errorMessage,
  id,
  isLocating = false,
  label,
  locateButtonLabel,
  name,
  onLocate,
  placeholder,
  required,
  selectedLocation,
  value,
  onSelectedLocationChange,
  onValueChange,
}: TripPlannerSuggestionInputProps) => {
  const errorId = useId();
  const assistiveMessageId = useId();
  const listboxId = useId();
  const isFocusedRef = useRef(false);
  const debounceTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const latestRequestIdRef = useRef(0);
  const suggestionCacheRef = useRef(new Map<string, TripPlannerSuggestion[]>());
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<TripPlannerSuggestion[]>([]);

  const normalizedValue = normalizeSuggestionQuery(value);
  const queryKey = getSuggestionQueryKey(value);
  const selectedLocationKey = selectedLocation
    ? getSuggestionQueryKey(selectedLocation.label)
    : null;
  const hasSuggestionQuery = normalizedValue.length >= MIN_SUGGESTION_QUERY_LENGTH;
  const activeSuggestionId =
    highlightedIndex >= 0
      ? `${listboxId}-option-${getTripPlannerSuggestionKey(suggestions[highlightedIndex])}`
      : undefined;
  const showRequiredError = required && hasBeenTouched && normalizedValue.length === 0;
  const describedBy = [
    showRequiredError ? errorId : null,
    assistiveMessage ? assistiveMessageId : null,
  ]
    .filter((id) => id !== null)
    .join(" ");

  useEffect(() => {
    if (debounceTimeoutRef.current !== null) {
      window.clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    if (!hasSuggestionQuery || selectedLocationKey === queryKey) {
      setSuggestions([]);
      setHighlightedIndex(-1);
      setIsOpen(false);
      return;
    }

    const cachedSuggestions = suggestionCacheRef.current.get(queryKey);
    if (cachedSuggestions) {
      setSuggestions(cachedSuggestions);
      setHighlightedIndex(-1);

      if (isFocusedRef.current && cachedSuggestions.length > 0) {
        setIsOpen(true);
      }

      return;
    }

    debounceTimeoutRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      abortControllerRef.current = controller;

      try {
        const response = await fetchTripPlannerSuggestions(
          { query: normalizedValue },
          controller.signal,
        );

        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        suggestionCacheRef.current.set(queryKey, response.suggestions);
        setSuggestions(response.suggestions);
        setHighlightedIndex(-1);
        setIsOpen(isFocusedRef.current && response.suggestions.length > 0);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (latestRequestIdRef.current !== requestId) {
          return;
        }

        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setSuggestions([]);
        setHighlightedIndex(-1);
        setIsOpen(false);
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => {
      if (debounceTimeoutRef.current !== null) {
        window.clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }

      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, [hasSuggestionQuery, normalizedValue, queryKey, selectedLocationKey]);

  const closeSuggestions = () => {
    setHighlightedIndex(-1);
    setIsOpen(false);
  };

  const applySuggestion = (suggestion: TripPlannerSuggestion) => {
    suggestionCacheRef.current.set(getSuggestionQueryKey(suggestion.label), [suggestion]);
    setHasBeenTouched(true);
    onValueChange(suggestion.label);
    onSelectedLocationChange(suggestion);
    setSuggestions([]);
    closeSuggestions();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    const nextQueryKey = getSuggestionQueryKey(nextValue);
    const nextNormalizedValue = normalizeSuggestionQuery(nextValue);

    setHasBeenTouched(true);
    onValueChange(nextValue);

    if (selectedLocationKey !== nextQueryKey) {
      onSelectedLocationChange(null);
    }

    setHighlightedIndex(-1);

    if (nextNormalizedValue.length < MIN_SUGGESTION_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const cachedSuggestions = suggestionCacheRef.current.get(nextQueryKey) ?? [];
    setSuggestions(cachedSuggestions);
    setIsOpen(cachedSuggestions.length > 0);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;

    if (!hasSuggestionQuery || selectedLocationKey === queryKey) {
      return;
    }

    const cachedSuggestions = suggestionCacheRef.current.get(queryKey);
    if (cachedSuggestions && cachedSuggestions.length > 0) {
      setSuggestions(cachedSuggestions);
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    setHasBeenTouched(true);
    closeSuggestions();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      closeSuggestions();
      return;
    }

    if (suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter" && isOpen && highlightedIndex >= 0) {
      event.preventDefault();
      applySuggestion(suggestions[highlightedIndex]);
    }
  };

  return (
    <div className="relative space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          id={id}
          name={name}
          className={cn(
            INPUT_CLASS_NAME,
            onLocate ? "pr-14" : null,
            showRequiredError &&
              "border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/40",
          )}
          autoComplete="off"
          value={value}
          onBlur={handleBlur}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-describedby={describedBy || undefined}
          aria-invalid={showRequiredError || undefined}
          aria-required={required}
          required={required}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={isOpen ? activeSuggestionId : undefined}
          aria-expanded={isOpen}
        />

        {onLocate && locateButtonLabel ? (
          <button
            type="button"
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/72 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60 dark:hover:bg-slate-900/72"
            aria-label={locateButtonLabel}
            title={locateButtonLabel}
            onClick={onLocate}
            disabled={isLocating}
          >
            {isLocating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>

      {showRequiredError && errorMessage ? (
        <p id={errorId} className="text-sm text-destructive" aria-live="polite">
          {errorMessage}
        </p>
      ) : null}

      {assistiveMessage ? (
        <p
          id={assistiveMessageId}
          className={cn(
            "text-sm",
            assistiveMessageTone === "error" ? "text-destructive" : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {assistiveMessage}
        </p>
      ) : null}

      {isOpen ? (
        <div id={listboxId} role="listbox" tabIndex={-1} className={SUGGESTION_LIST_CLASS_NAME}>
          {suggestions.map((suggestion, index) => (
            <div
              key={getTripPlannerSuggestionKey(suggestion)}
              id={`${listboxId}-option-${getTripPlannerSuggestionKey(suggestion)}`}
              role="option"
              tabIndex={-1}
              aria-selected={highlightedIndex === index}
              className={cn(
                SUGGESTION_OPTION_CLASS_NAME,
                highlightedIndex === index && "bg-white/82 text-foreground dark:bg-slate-900/86",
              )}
              onMouseEnter={() => setHighlightedIndex(index)}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                applySuggestion(suggestion);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  applySuggestion(suggestion);
                }
              }}
            >
              {suggestion.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const TripPlannerPage = () => {
  const t = useTranslations("tripPlanner");
  const homeFilterT = useTranslations("home.filters");
  const resultsFiltersId = useId();
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [originLocation, setOriginLocation] = useState<TripPlannerResolvedLocation | null>(null);
  const [destinationLocation, setDestinationLocation] =
    useState<TripPlannerResolvedLocation | null>(null);
  const [originLocationStatus, setOriginLocationStatus] = useState<UserLocationStatus>("idle");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<TripPlannerUiResult | null>(null);
  const [activeParkFilter, setActiveParkFilter] = useState<TripPlannerParkTypeFilter>("all");
  const [activeVisitStatus, setActiveVisitStatus] = useState<VisitStatusFilter>(
    DEFAULT_VISIT_STATUS_FILTER,
  );
  const [activeDistanceKm, setActiveDistanceKm] = useState(DEFAULT_DISTANCE_FILTER_KM);
  const [activeView, setActiveView] = useState<ViewTab>("map");
  const [isSearchPanelExpanded, setIsSearchPanelExpanded] = useState(true);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const isResultsLoading = searchState === "loading";
  const normalizedOriginQuery = normalizeSuggestionQuery(originQuery);
  const normalizedDestinationQuery = normalizeSuggestionQuery(destinationQuery);
  const hasOriginQuery = normalizedOriginQuery.length > 0;
  const isMobileResultsLayout = useMediaQuery(MOBILE_RESULTS_FILTER_MEDIA_QUERY);
  const activeMode: TripPlannerMode =
    result?.mode ?? (normalizedDestinationQuery.length > 0 ? "route" : "nearby");

  const parkTypeOptions = useMemo(() => {
    const parkTypeFilterOptionsById = new Map(
      Object.entries(PARK_TYPE_FILTER_LABEL_KEYS) as Array<
        [FilterableParkTypeSlug, ParkTypeFilterLabelKey]
      >,
    );

    return [
      { id: "all", label: homeFilterT("all") },
      { id: "areas", label: homeFilterT("areas") },
      {
        id: "national-park",
        label: homeFilterT(parkTypeFilterOptionsById.get("national-park") ?? "nationalParks"),
      },
      {
        id: HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG,
        label: homeFilterT("hikingAndWildernessAreas"),
      },
      {
        id: "nature-reserve-area",
        label: homeFilterT(
          parkTypeFilterOptionsById.get("nature-reserve-area") ?? "otherNatureReserves",
        ),
      },
      {
        id: "outdoor-recreation-area",
        label: homeFilterT(
          parkTypeFilterOptionsById.get("outdoor-recreation-area") ?? "outdoorRecreationAreas",
        ),
      },
      {
        id: "cultural-history-area",
        label: homeFilterT(
          parkTypeFilterOptionsById.get("cultural-history-area") ?? "culturalHistoryAreas",
        ),
      },
      { id: TRAILS_AND_ROUTES_CATEGORY_SLUG, label: homeFilterT("natureTrails") },
    ] satisfies Array<{ id: TripPlannerParkTypeFilter; label: string }>;
  }, [homeFilterT]);

  const filteredParks = useMemo(() => {
    const parks = result?.parks ?? [];

    return parks.filter((park) => {
      const matchesVisitStatus =
        activeVisitStatus === "all"
          ? true
          : activeVisitStatus === "visited"
            ? park.visitedSummary.visited
            : !park.visitedSummary.visited;

      const matchesParkType = (() => {
        switch (activeParkFilter) {
          case "all":
            return true;
          case "areas":
            return isAreaPark(park);
          case HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG:
            return isHikingAndWildernessPark(park);
          case TRAILS_AND_ROUTES_CATEGORY_SLUG:
            return isTrailPark(park);
          case "national-park":
          case "nature-reserve-area":
          case "outdoor-recreation-area":
          case "cultural-history-area":
            return park.type.slug === activeParkFilter;
          default:
            return true;
        }
      })();

      return matchesVisitStatus && matchesParkType && park.distanceKm <= activeDistanceKm;
    });
  }, [activeDistanceKm, activeParkFilter, activeVisitStatus, result]);

  const groupedResults = useMemo(() => splitTripPlannerResults(filteredParks), [filteredParks]);
  const totalParkCount = result?.parks.length ?? 0;
  const filteredParkCount = filteredParks.length;
  const hasFilteredResults = filteredParkCount > 0;
  const shouldShowFilters = totalParkCount > FILTER_VISIBILITY_THRESHOLD;
  const isResultsFiltersVisible = !isMobileResultsLayout || isMobileFiltersOpen;
  const originLocationStatusMessage = getUserLocationStatusMessage(originLocationStatus, t);
  const routeDistanceLabel = result?.route ? removeTrailingColon(t("routeDistance")) : null;
  const routeDurationLabel = result?.route ? removeTrailingColon(t("routeDuration")) : null;
  const routeDistanceValue = result?.route
    ? formatRouteDistance(result.route.distanceMeters)
    : null;
  const routeDurationValue = result?.route
    ? formatRouteDuration(result.route.durationSeconds)
    : null;
  const activeDistanceMaxKm = result?.maxDistanceKm ?? DEFAULT_DISTANCE_FILTER_KM;

  useEffect(() => {
    if (!shouldShowFilters) {
      setIsMobileFiltersOpen(false);
    }
  }, [shouldShowFilters]);

  const resetLocalFilters = (nextResult: TripPlannerUiResult | null = result) => {
    if (!nextResult) {
      return;
    }

    setActiveParkFilter("all");
    setActiveVisitStatus(DEFAULT_VISIT_STATUS_FILTER);
    setActiveDistanceKm(nextResult.defaultDistanceKm);
  };

  const getResultsTitle = (mode: TripPlannerMode) =>
    mode === "route" ? t("resultsTitle") : t("resultsTitleNearby");

  const getDistanceLabel = (mode: TripPlannerMode) =>
    mode === "route" ? t("distanceFromRoute") : t("distanceFromOrigin");

  const getDistanceFilterLabel = (mode: TripPlannerMode) =>
    mode === "route" ? t("filters.distanceLabel") : t("filters.distanceFromOriginLabel");

  const getNoResultsLabel = (mode: TripPlannerMode) =>
    mode === "route" ? t("noResults") : t("noResultsNearby");

  const handleOriginValueChange = (value: string) => {
    if (originLocationStatus !== "locating") {
      setOriginLocationStatus("idle");
    }

    setOriginQuery(value);
  };

  const handleLocateOrigin = () => {
    const geolocation = window.navigator.geolocation;

    if (!geolocation) {
      setOriginLocationStatus("unsupported");
      return;
    }

    setErrorMessage(null);
    setOriginLocationStatus("locating");

    geolocation.getCurrentPosition(
      async (position) => {
        const fallbackLocation = {
          coordinate: {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          },
          label: formatCoordinateQuery({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          }),
        } satisfies TripPlannerResolvedLocation;

        try {
          const response = await fetchTripPlannerSuggestions({
            query: fallbackLocation.label,
          });
          const resolvedLocation = response.suggestions[0] ?? fallbackLocation;

          setOriginQuery(resolvedLocation.label);
          setOriginLocation(resolvedLocation);
        } catch {
          setOriginQuery(fallbackLocation.label);
          setOriginLocation(fallbackLocation);
        } finally {
          setOriginLocationStatus("idle");
        }
      },
      (error) => {
        setOriginLocationStatus(getUserLocationStatusFromError(error));
      },
      LOCATION_REQUEST_OPTIONS,
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasOriginQuery) {
      return;
    }

    setSearchState("loading");
    setErrorMessage(null);

    try {
      const response =
        normalizedDestinationQuery.length > 0
          ? normalizeTripPlannerSearchResponse(
              await searchTripPlanner({
                destinationQuery: normalizedDestinationQuery,
                originQuery: normalizedOriginQuery,
              }),
            )
          : normalizeTripPlannerNearbyResponse(
              await searchTripPlannerNearby({
                maxDistanceKm: DEFAULT_DISTANCE_FILTER_KM,
                originQuery: normalizedOriginQuery,
              }),
            );

      resetLocalFilters(response);
      setResult(response);
      setActiveView("map");
      setIsMobileFiltersOpen(false);
      setIsSearchPanelExpanded(false);
      setSearchState("success");
    } catch (failure) {
      setSearchState("error");
      setResult(null);
      setErrorMessage(failure instanceof Error ? failure.message : t("errors.generic"));
    }
  };

  return (
    <div className={PUBLIC_PAGE_SHELL_CLASS_NAME}>
      <section
        className={cn(
          PUBLIC_PANEL_CLASS_NAME,
          "relative space-y-4",
          isSearchPanelExpanded ? "z-20" : "z-10",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className={cn("min-w-0 flex-1", PUBLIC_HERO_HEADING_STACK_CLASS_NAME)}>
            <div className={PUBLIC_EYEBROW_BADGE_CLASS_NAME}>
              <Route className="h-4 w-4" aria-hidden="true" />
              <span>{t("eyebrow")}</span>
            </div>
            <h1 className={PUBLIC_HERO_TITLE_CLASS_NAME}>{t("title")}</h1>
          </div>

          {result ? (
            <Button
              className="self-start rounded-xl"
              type="button"
              variant="outline"
              onClick={() => setIsSearchPanelExpanded((current) => !current)}
            >
              {isSearchPanelExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  <span>{t("collapseSearch")}</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  <span>{t("expandSearch")}</span>
                </>
              )}
            </Button>
          ) : null}
        </div>

        {isSearchPanelExpanded ? (
          <p className={PUBLIC_HERO_DESCRIPTION_CLASS_NAME}>
            {renderMultilineText(t("description"))}
          </p>
        ) : result ? (
          <dl
            className={cn(
              "grid gap-2 text-sm text-muted-foreground",
              result.mode === "route" ? "md:grid-cols-2" : "md:grid-cols-1",
            )}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:block">
              <dt className="inline font-medium text-foreground md:block">
                {t("originResolvedLabel")}
              </dt>
              <dd className="inline md:block">{result.origin.label}</dd>
            </div>
            {result.destination ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:block">
                <dt className="inline font-medium text-foreground md:block">
                  {t("destinationResolvedLabel")}
                </dt>
                <dd className="inline md:block">{result.destination.label}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div
          className={cn(
            "grid transition-all duration-300 ease-out",
            isSearchPanelExpanded
              ? "grid-rows-[1fr] overflow-visible opacity-100"
              : "grid-rows-[0fr] overflow-hidden opacity-0",
          )}
          aria-hidden={!isSearchPanelExpanded}
        >
          <div className="min-h-0">
            <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleSubmit}>
              <TripPlannerSuggestionInput
                assistiveMessage={originLocationStatusMessage ?? undefined}
                assistiveMessageTone={
                  originLocationStatus !== "idle" && originLocationStatus !== "locating"
                    ? "error"
                    : "default"
                }
                errorMessage={t("errors.originRequired")}
                id="trip-planner-origin"
                isLocating={originLocationStatus === "locating"}
                label={
                  <>
                    <span>{t("originLabel")}</span>
                    <span className="text-primary" aria-hidden="true">
                      {" *"}
                    </span>
                  </>
                }
                name="originQuery"
                locateButtonLabel={t("originLocate")}
                onLocate={handleLocateOrigin}
                onSelectedLocationChange={setOriginLocation}
                onValueChange={handleOriginValueChange}
                placeholder={t("originPlaceholder")}
                required
                selectedLocation={originLocation}
                value={originQuery}
              />

              <TripPlannerSuggestionInput
                id="trip-planner-destination"
                label={t("destinationLabel")}
                name="destinationQuery"
                onSelectedLocationChange={setDestinationLocation}
                onValueChange={setDestinationQuery}
                placeholder={t("destinationPlaceholder")}
                required={false}
                selectedLocation={destinationLocation}
                value={destinationQuery}
              />

              <div className="flex items-end md:items-start md:pt-[26px]">
                <Button
                  className="w-full rounded-xl md:w-auto"
                  disabled={!hasOriginQuery || isResultsLoading}
                  type="submit"
                >
                  {t("submit")}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {errorMessage ? (
          <p
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
      </section>

      {result || isResultsLoading ? (
        <section
          className={cn(PUBLIC_PANEL_CLASS_NAME, "relative z-0 space-y-5")}
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold text-foreground">{getResultsTitle(activeMode)}</h2>

            {shouldShowFilters && isMobileResultsLayout ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  "shrink-0 rounded-xl",
                  isMobileFiltersOpen &&
                    "border-primary/40 bg-primary/12 text-primary hover:bg-primary/18 dark:border-primary/40 dark:bg-primary/16",
                )}
                aria-controls={resultsFiltersId}
                aria-expanded={isMobileFiltersOpen}
                aria-label={isMobileFiltersOpen ? t("filters.hideMobile") : t("filters.showMobile")}
                onClick={() => setIsMobileFiltersOpen((current) => !current)}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          {isResultsLoading ? (
            <TripPlannerResultsLoadingState loadingLabel={t("loading")} />
          ) : result ? (
            <>
              <div className="w-full">
                <div
                  className={cn(
                    "grid w-full gap-x-4",
                    result.route &&
                      !isMobileResultsLayout &&
                      "md:grid-cols-[minmax(0,1fr)_auto] md:items-start",
                    isMobileResultsLayout && shouldShowFilters && !isResultsFiltersVisible
                      ? "gap-y-0"
                      : "gap-y-4",
                  )}
                >
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm text-muted-foreground">
                          {t("filteredResultsCount", {
                            shown: String(filteredParkCount),
                            total: String(totalParkCount),
                          })}
                        </p>

                        <div
                          className="inline-flex rounded-[1.1rem] border border-white/45 bg-white/60 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/42 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                          role="tablist"
                          aria-label={t("viewTabs.ariaLabel")}
                        >
                          <button
                            type="button"
                            role="tab"
                            id="trip-planner-view-map"
                            aria-controls="trip-planner-panel-map"
                            aria-selected={activeView === "map"}
                            onClick={() => setActiveView("map")}
                            className={cn(
                              "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                              activeView === "map"
                                ? "bg-white/86 text-foreground shadow-[0_8px_18px_rgba(148,163,184,0.16)] dark:bg-slate-950/68"
                                : "text-muted-foreground hover:bg-white/62 hover:text-foreground dark:hover:bg-slate-950/56",
                            )}
                          >
                            {t("viewTabs.map")}
                          </button>
                          <button
                            type="button"
                            role="tab"
                            id="trip-planner-view-list"
                            aria-controls="trip-planner-panel-list"
                            aria-selected={activeView === "list"}
                            onClick={() => setActiveView("list")}
                            className={cn(
                              "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                              activeView === "list"
                                ? "bg-white/86 text-foreground shadow-[0_8px_18px_rgba(148,163,184,0.16)] dark:bg-slate-950/68"
                                : "text-muted-foreground hover:bg-white/62 hover:text-foreground dark:hover:bg-slate-950/56",
                            )}
                          >
                            {t("viewTabs.list")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {result.route &&
                  routeDistanceLabel &&
                  routeDurationLabel &&
                  routeDistanceValue &&
                  routeDurationValue ? (
                    <div
                      className={cn(
                        "rounded-2xl border border-white/45 bg-white/74 px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/10 dark:bg-slate-950/46 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                        !isMobileResultsLayout && "md:justify-self-end",
                        isMobileResultsLayout &&
                          shouldShowFilters &&
                          !isResultsFiltersVisible &&
                          "mt-0",
                      )}
                    >
                      {isMobileResultsLayout ? (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Route className="h-4 w-4 text-foreground" aria-hidden="true" />
                          <span className="font-medium text-foreground">
                            {t("routeSummaryTitle")}
                          </span>
                          <span className="text-foreground" aria-hidden="true">
                            •
                          </span>
                          <TripPlannerRouteSummaryValue
                            label={routeDistanceLabel}
                            value={routeDistanceValue}
                          />
                          <span className="text-foreground" aria-hidden="true">
                            •
                          </span>
                          <TripPlannerRouteSummaryValue
                            label={routeDurationLabel}
                            value={routeDurationValue}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <Route className="h-4 w-4" aria-hidden="true" />
                            <span>{t("routeSummaryTitle")}</span>
                          </div>
                          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <TripPlannerRouteSummaryValue
                              label={routeDistanceLabel}
                              value={routeDistanceValue}
                            />
                            <span className="text-foreground" aria-hidden="true">
                              •
                            </span>
                            <TripPlannerRouteSummaryValue
                              label={routeDurationLabel}
                              value={routeDurationValue}
                            />
                          </p>
                        </>
                      )}
                    </div>
                  ) : null}

                  {shouldShowFilters ? (
                    <div
                      id={resultsFiltersId}
                      aria-hidden={isMobileResultsLayout ? !isMobileFiltersOpen : undefined}
                      className={cn(
                        result.route && !isMobileResultsLayout && "md:col-span-2",
                        "overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out motion-reduce:transition-none",
                        isResultsFiltersVisible
                          ? "max-h-[28rem] translate-y-0 opacity-100"
                          : "pointer-events-none max-h-0 -translate-y-1 opacity-0",
                      )}
                    >
                      <div className="grid gap-3 pt-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
                        <div className={FILTER_GROUP_CLASS_NAME}>
                          <Label htmlFor="trip-planner-park-filter">
                            {t("filters.parkTypeLabel")}
                          </Label>
                          <div className="relative">
                            <select
                              id="trip-planner-park-filter"
                              className={INLINE_SELECT_CLASS_NAME}
                              value={activeParkFilter}
                              disabled={!isResultsFiltersVisible}
                              onChange={(event) =>
                                setActiveParkFilter(event.target.value as TripPlannerParkTypeFilter)
                              }
                            >
                              {parkTypeOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                              aria-hidden="true"
                            />
                          </div>
                        </div>

                        <div className={FILTER_GROUP_CLASS_NAME}>
                          <Label htmlFor="trip-planner-visit-status-filter">
                            {t("filters.visitStatusLabel")}
                          </Label>
                          <div className="relative">
                            <select
                              id="trip-planner-visit-status-filter"
                              className={INLINE_SELECT_CLASS_NAME}
                              value={activeVisitStatus}
                              disabled={!isResultsFiltersVisible}
                              onChange={(event) =>
                                setActiveVisitStatus(event.target.value as VisitStatusFilter)
                              }
                            >
                              <option value="all">{homeFilterT("visitStatusAll")}</option>
                              <option value="visited">{homeFilterT("visited")}</option>
                              <option value="not-visited">{homeFilterT("notVisited")}</option>
                            </select>
                            <ChevronDown
                              className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                              aria-hidden="true"
                            />
                          </div>
                        </div>

                        <div className={FILTER_GROUP_CLASS_NAME}>
                          <div className="flex items-center justify-between gap-3">
                            <Label htmlFor="trip-planner-distance-filter">
                              {getDistanceFilterLabel(result.mode)}
                            </Label>
                            <span className="text-sm font-medium text-foreground">
                              {activeDistanceKm} km
                            </span>
                          </div>
                          <div className="flex h-10 items-center">
                            <input
                              id="trip-planner-distance-filter"
                              className={INLINE_SLIDER_CLASS_NAME}
                              type="range"
                              min={MIN_DISTANCE_FILTER_KM}
                              max={activeDistanceMaxKm}
                              step={1}
                              value={activeDistanceKm}
                              disabled={!isResultsFiltersVisible}
                              onChange={(event) => setActiveDistanceKm(Number(event.target.value))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {activeView === "list" ? (
                <div
                  id="trip-planner-panel-list"
                  role="tabpanel"
                  aria-labelledby="trip-planner-view-list"
                >
                  {totalParkCount === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/45 bg-white/50 px-4 py-6 text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-950/38">
                      {getNoResultsLabel(result.mode)}
                    </p>
                  ) : !hasFilteredResults ? (
                    <div className="rounded-xl border border-dashed border-white/45 bg-white/50 px-4 py-6 dark:border-white/10 dark:bg-slate-950/38">
                      <p className="text-sm text-muted-foreground">{t("filteredEmpty")}</p>
                      <Button
                        className="mt-4 rounded-xl"
                        type="button"
                        variant="outline"
                        onClick={() => resetLocalFilters()}
                      >
                        {t("filters.reset")}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <TripPlannerResultsSection
                        title={t("sections.notVisited")}
                        distanceLabel={getDistanceLabel(result.mode)}
                        parks={groupedResults.notVisited}
                        statusLabel={t("notVisited")}
                      />
                      <TripPlannerResultsSection
                        title={t("sections.visited")}
                        distanceLabel={getDistanceLabel(result.mode)}
                        parks={groupedResults.visited}
                        statusLabel={t("visited")}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  id="trip-planner-panel-map"
                  role="tabpanel"
                  aria-labelledby="trip-planner-view-map"
                  className="space-y-4"
                >
                  <TripPlannerMap
                    destination={result.destination}
                    distanceLabel={getDistanceLabel(result.mode)}
                    mode={result.mode}
                    origin={result.origin}
                    parks={filteredParks}
                    route={result.route}
                    searchArea={result.searchArea}
                    visibleDistanceKm={result.mode === "nearby" ? activeDistanceKm : undefined}
                  />

                  {totalParkCount === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/45 bg-white/50 px-4 py-6 text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-950/38">
                      {getNoResultsLabel(result.mode)}
                    </p>
                  ) : !hasFilteredResults ? (
                    <div className="rounded-xl border border-dashed border-white/45 bg-white/50 px-4 py-6 dark:border-white/10 dark:bg-slate-950/38">
                      <p className="text-sm text-muted-foreground">{t("filteredEmpty")}</p>
                      <Button
                        className="mt-4 rounded-xl"
                        type="button"
                        variant="outline"
                        onClick={() => resetLocalFilters()}
                      >
                        {t("filters.reset")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
};

interface TripPlannerResultsSectionProps {
  distanceLabel: string;
  parks: TripPlannerUiParkResult[];
  statusLabel: string;
  title: string;
}

const TripPlannerResultsSection = ({
  distanceLabel,
  parks,
  statusLabel,
  title,
}: TripPlannerResultsSectionProps) => {
  const t = useTranslations("tripPlanner");

  if (parks.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3" aria-labelledby={`trip-planner-section-${title}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 id={`trip-planner-section-${title}`} className="text-lg font-semibold text-foreground">
          {title}
        </h3>
        <span className="text-sm text-muted-foreground">{parks.length}</span>
      </div>

      <ul className="grid gap-3">
        {parks.map((park) => (
          <li key={park.slug}>
            <article className="rounded-[1.35rem] border border-white/45 bg-white/66 p-4 shadow-[0_14px_30px_rgba(148,163,184,0.16)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/48 dark:shadow-[0_20px_40px_rgba(2,6,23,0.3)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={appRoutes.park(park.slug)}
                      className="text-base font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {park.name}
                    </Link>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        park.visitedSummary.visited
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                          : "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100",
                      )}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    <span>{getParkTypeDisplayName(park)}</span>
                    <span className="mx-2 text-foreground/80 dark:text-white/85" aria-hidden="true">
                      •
                    </span>
                    <span>{park.address}</span>
                  </p>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground sm:text-right">
                  <p>
                    <span className="font-medium text-foreground">{distanceLabel}</span>{" "}
                    {formatDistance(park.distanceKm)}
                  </p>
                  {park.visitedSummary.visited ? (
                    <p>
                      <span className="font-medium text-foreground">{t("visitCount")}</span>{" "}
                      {park.visitedSummary.visitCount}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
};
