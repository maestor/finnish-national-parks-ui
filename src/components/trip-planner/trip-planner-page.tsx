"use client";

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
import {
  type TripPlannerParkResult,
  type TripPlannerResolvedLocation,
  type TripPlannerSuggestion,
  fetchTripPlannerSuggestions,
  searchTripPlanner,
} from "@/lib/trip-planner";
import { ChevronDown, ChevronUp, Loader2, Route } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { TripPlannerMap } from "./trip-planner-map";

const INPUT_CLASS_NAME =
  "flex h-11 w-full rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";
const PANEL_CLASS_NAME =
  "rounded-[1.75rem] border border-white/45 bg-white/72 p-5 shadow-[0_20px_44px_rgba(148,163,184,0.18)] backdrop-blur-md dark:border-white/10 dark:bg-slate-950/52 dark:shadow-[0_28px_56px_rgba(2,6,23,0.3)]";
const INLINE_SELECT_CLASS_NAME = cn(
  INPUT_CLASS_NAME,
  "h-10 rounded-lg px-3 py-2 pr-11 text-sm appearance-none md:min-w-44",
);
const INLINE_SLIDER_CLASS_NAME =
  "relative -top-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-sky-100 accent-primary dark:bg-slate-800";
const FILTER_GROUP_CLASS_NAME = "flex min-w-0 flex-col gap-1";
const DEFAULT_DISTANCE_FILTER_KM = 25;
const MIN_DISTANCE_FILTER_KM = 1;
const FILTER_VISIBILITY_THRESHOLD = 20;
const MIN_SUGGESTION_QUERY_LENGTH = 2;
const SUGGESTION_DEBOUNCE_MS = 250;
const SUGGESTION_LIST_CLASS_NAME =
  "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-[1.35rem] border border-white/55 bg-white/96 shadow-[0_20px_40px_rgba(148,163,184,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/94 dark:shadow-[0_24px_48px_rgba(2,6,23,0.42)]";
const SUGGESTION_OPTION_CLASS_NAME =
  "cursor-pointer px-3 py-2 text-sm text-foreground transition-colors hover:bg-white/82 dark:hover:bg-slate-900/82";

const DISTANCE_FORMATTER = new Intl.NumberFormat("fi-FI", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const DURATION_FORMATTER = new Intl.NumberFormat("fi-FI", {
  maximumFractionDigits: 0,
});

type SearchState = "idle" | "loading" | "success" | "error";
type VisitStatusFilter = "all" | "visited" | "not-visited";
type ViewTab = "list" | "map";
type TripPlannerParkTypeFilter =
  | "all"
  | "areas"
  | typeof HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG
  | typeof TRAILS_AND_ROUTES_CATEGORY_SLUG
  | FilterableParkTypeSlug;

const isTrailPark = (park: TripPlannerParkResult) =>
  park.category.slug === TRAILS_AND_ROUTES_CATEGORY_SLUG;

const isHikingAndWildernessPark = (park: TripPlannerParkResult) =>
  park.category.slug === HIKING_AND_WILDERNESS_AREAS_CATEGORY_SLUG;

const isAreaPark = (park: TripPlannerParkResult) => !isTrailPark(park);

const formatDistanceFromRoute = (distanceFromRouteKm: number) =>
  `${DISTANCE_FORMATTER.format(distanceFromRouteKm)} km`;

const formatRouteDistance = (distanceMeters: number) => `${Math.round(distanceMeters / 1000)} km`;

const formatRouteDuration = (durationSeconds: number) => {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.round((durationSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} h ${DURATION_FORMATTER.format(minutes)} min`;
  }

  return `${DURATION_FORMATTER.format(minutes)} min`;
};

const splitTripPlannerResults = (parks: TripPlannerParkResult[]) => {
  return parks.reduce(
    (groups, park) => {
      if (park.visitedSummary.visited) {
        groups.visited.push(park);
      } else {
        groups.notVisited.push(park);
      }

      return groups;
    },
    { visited: [] as TripPlannerParkResult[], notVisited: [] as TripPlannerParkResult[] },
  );
};

const normalizeSuggestionQuery = (query: string) => query.trim().replaceAll(/\s+/g, " ");

const getSuggestionQueryKey = (query: string) =>
  normalizeSuggestionQuery(query).toLocaleLowerCase("fi-FI");

type TripPlannerSuggestionInputProps = {
  id: string;
  label: string;
  name: string;
  placeholder: string;
  selectedLocation: TripPlannerResolvedLocation | null;
  value: string;
  onSelectedLocationChange: (location: TripPlannerResolvedLocation | null) => void;
  onValueChange: (value: string) => void;
};

const TripPlannerSuggestionInput = ({
  id,
  label,
  name,
  placeholder,
  selectedLocation,
  value,
  onSelectedLocationChange,
  onValueChange,
}: TripPlannerSuggestionInputProps) => {
  const listboxId = useId();
  const isFocusedRef = useRef(false);
  const debounceTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const latestRequestIdRef = useRef(0);
  const suggestionCacheRef = useRef(new Map<string, TripPlannerSuggestion[]>());
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
    highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined;

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
    onValueChange(suggestion.label);
    onSelectedLocationChange(suggestion);
    setSuggestions([]);
    closeSuggestions();
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    const nextQueryKey = getSuggestionQueryKey(nextValue);
    const nextNormalizedValue = normalizeSuggestionQuery(nextValue);

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
      <input
        id={id}
        name={name}
        className={INPUT_CLASS_NAME}
        autoComplete="off"
        value={value}
        onBlur={handleBlur}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required
        role="combobox"
        aria-autocomplete="list"
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={isOpen ? activeSuggestionId : undefined}
        aria-expanded={isOpen}
      />

      {isOpen ? (
        // biome-ignore lint/a11y/useSemanticElements: ARIA combobox popups intentionally use a listbox while focus stays on the text input.
        <div id={listboxId} role="listbox" tabIndex={-1} className={SUGGESTION_LIST_CLASS_NAME}>
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.label}-${index}`}
              id={`${listboxId}-option-${index}`}
              // biome-ignore lint/a11y/useSemanticElements: ARIA combobox popups intentionally expose each suggestion as an option instead of moving focus off the input.
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
                applySuggestion(suggestion);
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
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [originLocation, setOriginLocation] = useState<TripPlannerResolvedLocation | null>(null);
  const [destinationLocation, setDestinationLocation] =
    useState<TripPlannerResolvedLocation | null>(null);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof searchTripPlanner>> | null>(null);
  const [activeParkFilter, setActiveParkFilter] = useState<TripPlannerParkTypeFilter>("all");
  const [activeVisitStatus, setActiveVisitStatus] = useState<VisitStatusFilter>("all");
  const [activeDistanceKm, setActiveDistanceKm] = useState(DEFAULT_DISTANCE_FILTER_KM);
  const [activeView, setActiveView] = useState<ViewTab>("map");
  const [isSearchPanelExpanded, setIsSearchPanelExpanded] = useState(true);

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

      return matchesVisitStatus && matchesParkType && park.distanceFromRouteKm <= activeDistanceKm;
    });
  }, [activeDistanceKm, activeParkFilter, activeVisitStatus, result]);

  const groupedResults = useMemo(() => splitTripPlannerResults(filteredParks), [filteredParks]);
  const totalParkCount = result?.parks.length ?? 0;
  const filteredParkCount = filteredParks.length;
  const hasFilteredResults = filteredParkCount > 0;
  const shouldShowFilters = totalParkCount > FILTER_VISIBILITY_THRESHOLD;

  const resetLocalFilters = () => {
    setActiveParkFilter("all");
    setActiveVisitStatus("all");
    setActiveDistanceKm(DEFAULT_DISTANCE_FILTER_KM);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchState("loading");
    setErrorMessage(null);

    try {
      const response = await searchTripPlanner({
        destinationQuery: destinationQuery.trim(),
        originQuery: originQuery.trim(),
      });

      setResult(response);
      resetLocalFilters();
      setActiveView("map");
      setIsSearchPanelExpanded(false);
      setSearchState("success");
    } catch (failure) {
      setSearchState("error");
      setResult(null);
      setErrorMessage(failure instanceof Error ? failure.message : t("errors.generic"));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className={cn(PANEL_CLASS_NAME, "space-y-4")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
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
          <p className="text-sm leading-6 text-muted-foreground">{t("description")}</p>
        ) : result ? (
          <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground">{t("originResolvedLabel")}</dt>
              <dd>{result.origin.label}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">{t("destinationResolvedLabel")}</dt>
              <dd>{result.destination.label}</dd>
            </div>
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
                id="trip-planner-origin"
                label={t("originLabel")}
                name="originQuery"
                onSelectedLocationChange={setOriginLocation}
                onValueChange={setOriginQuery}
                placeholder={t("originPlaceholder")}
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
                selectedLocation={destinationLocation}
                value={destinationQuery}
              />

              <div className="flex items-end">
                <Button
                  className="w-full rounded-xl md:w-auto"
                  disabled={searchState === "loading"}
                  type="submit"
                >
                  {searchState === "loading" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>{t("loading")}</span>
                    </>
                  ) : (
                    t("submit")
                  )}
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

      {result ? (
        <section className={cn(PANEL_CLASS_NAME, "space-y-5")} aria-live="polite">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-foreground">{t("resultsTitle")}</h2>
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

              {shouldShowFilters ? (
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
                  <div className={FILTER_GROUP_CLASS_NAME}>
                    <Label htmlFor="trip-planner-park-filter">{t("filters.parkTypeLabel")}</Label>
                    <div className="relative">
                      <select
                        id="trip-planner-park-filter"
                        className={INLINE_SELECT_CLASS_NAME}
                        value={activeParkFilter}
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
                        {t("filters.distanceLabel")}
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
                        max={DEFAULT_DISTANCE_FILTER_KM}
                        step={1}
                        value={activeDistanceKm}
                        onChange={(event) => setActiveDistanceKm(Number(event.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/45 bg-white/74 px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/10 dark:bg-slate-950/46 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Route className="h-4 w-4" aria-hidden="true" />
                <span>{t("routeSummaryTitle")}</span>
              </div>
              <p className="mt-2 text-muted-foreground">
                {t("routeDistance")} {formatRouteDistance(result.route.distanceMeters)}
              </p>
              <p className="text-muted-foreground">
                {t("routeDuration")} {formatRouteDuration(result.route.durationSeconds)}
              </p>
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
                  {t("noResults")}
                </p>
              ) : !hasFilteredResults ? (
                <div className="rounded-xl border border-dashed border-white/45 bg-white/50 px-4 py-6 dark:border-white/10 dark:bg-slate-950/38">
                  <p className="text-sm text-muted-foreground">{t("filteredEmpty")}</p>
                  <Button
                    className="mt-4 rounded-xl"
                    type="button"
                    variant="outline"
                    onClick={resetLocalFilters}
                  >
                    {t("filters.reset")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <TripPlannerResultsSection
                    title={t("sections.notVisited")}
                    parks={groupedResults.notVisited}
                    statusLabel={t("notVisited")}
                  />
                  <TripPlannerResultsSection
                    title={t("sections.visited")}
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
                origin={result.origin}
                parks={filteredParks}
                route={result.route}
              />

              {totalParkCount === 0 ? (
                <p className="rounded-xl border border-dashed border-white/45 bg-white/50 px-4 py-6 text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-950/38">
                  {t("noResults")}
                </p>
              ) : !hasFilteredResults ? (
                <div className="rounded-xl border border-dashed border-white/45 bg-white/50 px-4 py-6 dark:border-white/10 dark:bg-slate-950/38">
                  <p className="text-sm text-muted-foreground">{t("filteredEmpty")}</p>
                  <Button
                    className="mt-4 rounded-xl"
                    type="button"
                    variant="outline"
                    onClick={resetLocalFilters}
                  >
                    {t("filters.reset")}
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
};

interface TripPlannerResultsSectionProps {
  parks: TripPlannerParkResult[];
  statusLabel: string;
  title: string;
}

const TripPlannerResultsSection = ({
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
                      href={`/park/${park.slug}`}
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
                    <span className="font-medium text-foreground">{t("distanceFromRoute")}</span>{" "}
                    {formatDistanceFromRoute(park.distanceFromRouteKm)}
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
