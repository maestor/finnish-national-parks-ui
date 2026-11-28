"use client";

import { MapPin, Search, TentTree, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { type CombinedSearchIndex, getParkTypeDisplayName } from "@/lib/parks";
import { appRoutes, normalizeAppPath } from "@/lib/routes";
import { useHomeMapControls } from "../providers/home-map-controls-provider";

const SEARCH_SURFACE_CLASS_NAME =
  "border border-input bg-control shadow-[0_10px_24px_rgba(var(--shadow-rgb),0.18)] backdrop-blur-md transition-colors hover:bg-accent";
const SEARCH_ICON_CLASS_NAME =
  "pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-icon stroke-[2.25]";
const SEARCH_INPUT_CLASS_NAME =
  "h-9 w-full rounded-full pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none";
const SEARCH_RESULTS_PANEL_CLASS_NAME =
  "fixed left-2 right-2 top-16 z-[70] flex min-h-0 max-h-[calc(100dvh-5rem)] flex-col overflow-hidden rounded-[1.75rem] border border-border bg-control text-popover-foreground shadow-[0_28px_60px_rgba(var(--shadow-rgb),0.28)] backdrop-blur-xl dark:shadow-[0_32px_64px_rgba(var(--shadow-rgb),0.44)] md:absolute md:left-0 md:right-0 md:top-[calc(100%+0.75rem)] md:max-h-none";
const MOBILE_SEARCH_RESULTS_PANEL_CLASS_NAME =
  "bg-control shadow-[0_32px_72px_rgba(var(--shadow-rgb),0.32)] dark:shadow-[0_36px_76px_rgba(var(--shadow-rgb),0.52)]";

type SearchResult =
  | { kind: "park"; park: CombinedSearchIndex["parks"][number] }
  | { kind: "trip"; trip: CombinedSearchIndex["trips"][number] };

const finnishSearchCollator = new Intl.Collator("fi-FI", { sensitivity: "base" });

const sortSearchResults = (results: SearchResult[]) =>
  results.sort((left, right) => {
    const leftName = left.kind === "trip" ? left.trip.name : left.park.name;
    const rightName = right.kind === "trip" ? right.trip.name : right.park.name;
    return (
      finnishSearchCollator.compare(leftName, rightName) ||
      left.kind.localeCompare(right.kind) ||
      (left.kind === "trip" ? left.trip.slug : left.park.slug).localeCompare(
        right.kind === "trip" ? right.trip.slug : right.park.slug,
      )
    );
  });

export const HomeParkSearch = () => {
  const t = useTranslations("layout.parkSearch");
  const router = useRouter();
  const pathname = usePathname();
  const normalizedPathname = normalizeAppPath(pathname);
  const { closeMobileFilters, focusParkOnHome } = useHomeMapControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const loadStartedRef = useRef(false);
  const loadIdRef = useRef(0);
  const [searchIndex, setSearchIndex] = useState<CombinedSearchIndex | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isParksMapPage = normalizedPathname === appRoutes.parks;

  // Refresh the index each time the visitor opens search.
  const loadSearchIndex = () => {
    if (loadStartedRef.current) {
      return;
    }
    loadStartedRef.current = true;
    const loadId = ++loadIdRef.current;
    setSearchIndex(null);
    setIsLoading(true);

    apiFetch<CombinedSearchIndex>("/api/search", { cache: "no-store" })
      .then((data) => {
        if (loadId === loadIdRef.current) setSearchIndex(data);
      })
      .catch(() => {
        if (loadId === loadIdRef.current) setSearchIndex(null);
      })
      .finally(() => {
        if (loadId === loadIdRef.current) setIsLoading(false);
      });
  };

  const closeSearch = useCallback(() => {
    loadIdRef.current += 1;
    loadStartedRef.current = false;
    setSearchIndex(null);
    setIsLoading(false);
    setIsOpen(false);
    setIsMobileOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!containerRef.current?.contains(target)) {
        closeSearch();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeSearch]);

  useEffect(() => {
    if (isMobileOpen) {
      mobileInputRef.current?.focus();
    }
  }, [isMobileOpen]);

  const results = useMemo(() => {
    const trimmedQuery = query.trim().toLocaleLowerCase("fi-FI");
    if (!searchIndex) return [];

    const parkNamesBySlug = new Map(searchIndex.parks.map((park) => [park.slug, park.name]));
    const matches = (value: string) => value.toLocaleLowerCase("fi-FI").includes(trimmedQuery);
    const matchingParks = (visited: boolean): SearchResult[] =>
      searchIndex.parks
        .filter((park) => park.visited === visited)
        .filter(
          (park) =>
            trimmedQuery.length === 0 ||
            [
              park.name,
              getParkTypeDisplayName(park),
              park.type.name,
              park.address,
              ...park.trailNames,
              ...(park.areaNames ?? []),
            ].some(matches),
        )
        .map((park) => ({ kind: "park", park }));
    const matchingTrips: SearchResult[] = searchIndex.trips
      .filter(
        (trip) =>
          trimmedQuery.length === 0 ||
          matches(trip.name) ||
          trip.stopNames.some(matches) ||
          trip.visitedParkSlugs.some((slug) => {
            const parkName = parkNamesBySlug.get(slug);
            return parkName ? matches(parkName) : false;
          }),
      )
      .map((trip) => ({ kind: "trip", trip }));

    return [
      ...sortSearchResults([...matchingParks(true), ...matchingTrips]),
      ...sortSearchResults(matchingParks(false)),
    ];
  }, [query, searchIndex]);

  const activateResult = (result: SearchResult) => {
    setQuery("");
    closeSearch();

    if (result.kind === "trip") {
      router.push(appRoutes.trip(result.trip.slug));
      return;
    }

    if (isParksMapPage) {
      closeMobileFilters();
      focusParkOnHome(result.park.slug);
      return;
    }

    router.push(appRoutes.park(result.park.slug));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      loadSearchIndex();
      setIsOpen(true);
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter" && results[highlightedIndex]) {
      event.preventDefault();
      activateResult(results[highlightedIndex]);
      return;
    }

    if (event.key === "Escape") {
      const wasMobileOpen = isMobileOpen;
      closeSearch();
      if (wasMobileOpen) mobileButtonRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative w-auto md:w-full md:max-w-md">
      <button
        ref={mobileButtonRef}
        type="button"
        onClick={() => {
          if (isMobileOpen) {
            closeSearch();
            return;
          }
          loadSearchIndex();
          setHighlightedIndex(0);
          setIsOpen(true);
          setIsMobileOpen(true);
        }}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden",
          SEARCH_SURFACE_CLASS_NAME,
        )}
        aria-label={t("label")}
        aria-expanded={isMobileOpen}
        aria-controls="home-park-search-results"
      >
        {isMobileOpen ? (
          <X className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Search className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      <div className="hidden md:block">
        <label htmlFor="home-park-search" className="sr-only">
          {t("label")}
        </label>
        <Search className={SEARCH_ICON_CLASS_NAME} aria-hidden="true" />
        <input
          id="home-park-search"
          type="search"
          value={query}
          onChange={(event) => {
            loadSearchIndex();
            setQuery(event.target.value);
            setHighlightedIndex(0);
            setIsOpen(true);
          }}
          onFocus={() => {
            loadSearchIndex();
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t("placeholder")}
          className={cn(SEARCH_INPUT_CLASS_NAME, SEARCH_SURFACE_CLASS_NAME)}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="home-park-search-results"
        />
      </div>

      {isOpen === true && (
        <div
          id="home-park-search-results"
          className={cn(
            SEARCH_RESULTS_PANEL_CLASS_NAME,
            isMobileOpen && MOBILE_SEARCH_RESULTS_PANEL_CLASS_NAME,
          )}
        >
          {isMobileOpen === true && (
            <div className="border-b border-border bg-control p-2 md:hidden">
              <label htmlFor="home-park-search-mobile" className="sr-only">
                {t("label")}
              </label>
              <div className="relative">
                <Search className={SEARCH_ICON_CLASS_NAME} aria-hidden="true" />
                <input
                  ref={mobileInputRef}
                  id="home-park-search-mobile"
                  type="search"
                  value={query}
                  onChange={(event) => {
                    loadSearchIndex();
                    setQuery(event.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={t("placeholder")}
                  className={cn(SEARCH_INPUT_CLASS_NAME, SEARCH_SURFACE_CLASS_NAME)}
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          {isLoading ? (
            <p role="status" className="px-4 py-3 text-sm text-muted-foreground">
              {t("loading")}
            </p>
          ) : results.length === 0 ? (
            <p role="status" className="px-4 py-3 text-sm text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <ul className="max-h-[calc(100dvh-9.5rem)] flex-1 overflow-y-auto overscroll-contain bg-control px-2 py-2 touch-pan-y [-webkit-overflow-scrolling:touch] md:max-h-80">
              {results.map((result, index) => {
                const name = result.kind === "trip" ? result.trip.name : result.park.name;
                const slug = result.kind === "trip" ? result.trip.slug : result.park.slug;
                const closeAfterNavigation = () => {
                  setQuery("");
                  closeSearch();
                };

                return (
                  <li
                    key={`${result.kind}:${slug}`}
                    className="border-b border-border last:border-b-0"
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5",
                        isMobileOpen && "rounded-[1.35rem]",
                        highlightedIndex === index &&
                          "rounded-2xl bg-control text-foreground shadow-[0_12px_24px_rgba(var(--shadow-rgb),0.18)] dark:shadow-[0_16px_28px_rgba(var(--shadow-rgb),0.28)]",
                      )}
                    >
                      {result.kind === "trip" ? (
                        <Link
                          href={appRoutes.trip(result.trip.slug)}
                          prefetch={false}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          onClick={closeAfterNavigation}
                          className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <TentTree
                            className="mt-0.5 h-4 w-4 shrink-0 text-link stroke-[2.25]"
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {t("trip")}
                            </span>
                          </span>
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onMouseEnter={() => setHighlightedIndex(index)}
                          onClick={() => activateResult(result)}
                          className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <MapPin
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0 stroke-[2.25]",
                              result.park.visited ? "text-icon" : "text-muted-foreground",
                            )}
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {getParkTypeDisplayName(result.park)}
                            </span>
                          </span>
                        </button>
                      )}
                      {result.kind === "park" && isParksMapPage && (
                        <Link
                          href={appRoutes.park(result.park.slug)}
                          onClick={closeAfterNavigation}
                          className="shrink-0 rounded-full border border-border bg-control px-2.5 py-1 text-xs font-medium text-icon stroke-[2.25] shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.7)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {t("openParkPage")}
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
