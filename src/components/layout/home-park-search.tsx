"use client";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { type ParkSearchResult, getParkTypeDisplayName } from "@/lib/parks";
import { appRoutes, normalizeAppPath } from "@/lib/routes";
import { MapPin, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHomeMapControls } from "../providers/home-map-controls-provider";

const SEARCH_SURFACE_CLASS_NAME =
  "border border-white/45 bg-white/70 shadow-[0_10px_24px_rgba(148,163,184,0.18)] backdrop-blur-md transition-colors hover:bg-white/85 dark:border-white/10 dark:bg-slate-950/45 dark:hover:bg-slate-950/60";
const SEARCH_ICON_CLASS_NAME =
  "pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-foreground/60";
const SEARCH_INPUT_CLASS_NAME =
  "h-9 w-full rounded-full pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none";
const SEARCH_RESULTS_PANEL_CLASS_NAME =
  "fixed left-2 right-2 top-16 z-[70] flex min-h-0 max-h-[calc(100dvh-5rem)] flex-col overflow-hidden rounded-[1.75rem] border border-white/55 bg-white/88 text-popover-foreground shadow-[0_28px_60px_rgba(148,163,184,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/88 dark:shadow-[0_32px_64px_rgba(2,6,23,0.44)] md:absolute md:left-0 md:right-0 md:top-[calc(100%+0.75rem)] md:max-h-none";
const MOBILE_SEARCH_RESULTS_PANEL_CLASS_NAME =
  "bg-white/98 shadow-[0_32px_72px_rgba(148,163,184,0.32)] dark:bg-slate-950/97 dark:shadow-[0_36px_76px_rgba(2,6,23,0.52)]";

export const HomeParkSearch = () => {
  const t = useTranslations("layout.parkSearch");
  const router = useRouter();
  const pathname = usePathname();
  const normalizedPathname = normalizeAppPath(pathname);
  const { closeMobileFilters, focusParkOnHome } = useHomeMapControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [parks, setParks] = useState<ParkSearchResult[]>([]);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isParksMapPage = normalizedPathname === appRoutes.parks;

  useEffect(() => {
    let mounted = true;

    apiFetch<{ parks: ParkSearchResult[] }>("/api/parks/search")
      .then((data) => {
        if (!mounted) {
          return;
        }

        setParks(
          [...data.parks].sort((left, right) => left.name.localeCompare(right.name, "fi-FI")),
        );
      })
      .catch(() => {
        if (mounted) {
          setParks([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!containerRef.current?.contains(target)) {
        setIsOpen(false);
        setIsMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isMobileOpen) {
      mobileInputRef.current?.focus();
    }
  }, [isMobileOpen]);

  const results = useMemo(() => {
    const trimmedQuery = query.trim().toLocaleLowerCase("fi-FI");
    const filteredParks =
      trimmedQuery.length === 0
        ? parks
        : parks.filter((park) => {
            const displayTypeName = getParkTypeDisplayName(park);
            const haystacks = [park.name, displayTypeName, park.type.name, park.address];
            return haystacks.some((value) =>
              value.toLocaleLowerCase("fi-FI").includes(trimmedQuery),
            );
          });

    return filteredParks;
  }, [parks, query]);

  const activatePark = (park: ParkSearchResult) => {
    setQuery("");
    setIsOpen(false);
    setIsMobileOpen(false);

    if (isParksMapPage) {
      closeMobileFilters();
      focusParkOnHome(park.slug);
      return;
    }

    router.push(appRoutes.park(park.slug));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
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
      activatePark(results[highlightedIndex]);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setIsMobileOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-auto md:w-full md:max-w-md">
      <button
        type="button"
        onClick={() => {
          setHighlightedIndex(0);
          setIsOpen((current) => !current);
          setIsMobileOpen((current) => !current);
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
            setQuery(event.target.value);
            setHighlightedIndex(0);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
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

      {isOpen && (
        <div
          id="home-park-search-results"
          className={cn(
            SEARCH_RESULTS_PANEL_CLASS_NAME,
            isMobileOpen && MOBILE_SEARCH_RESULTS_PANEL_CLASS_NAME,
          )}
        >
          {isMobileOpen && (
            <div className="border-b border-white/35 bg-white/96 p-2 dark:border-white/10 dark:bg-slate-950/96 md:hidden">
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
            <p className="px-4 py-3 text-sm text-muted-foreground">{t("loading")}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul
              className={cn(
                "max-h-[calc(100dvh-9.5rem)] flex-1 overflow-y-auto overscroll-contain bg-white/96 px-2 py-2 touch-pan-y [-webkit-overflow-scrolling:touch] dark:bg-slate-950/96 md:max-h-80",
              )}
            >
              {results.map((park, index) => (
                <li
                  key={park.slug}
                  className="border-b border-white/35 last:border-b-0 dark:border-white/8"
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5",
                      isMobileOpen && "rounded-[1.35rem]",
                      highlightedIndex === index &&
                        "rounded-2xl bg-white/85 text-foreground shadow-[0_12px_24px_rgba(148,163,184,0.18)] dark:bg-slate-900/82 dark:shadow-[0_16px_28px_rgba(2,6,23,0.28)]",
                    )}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => activatePark(park)}
                      className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-2 py-1 text-left transition-colors hover:bg-white/85 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-slate-900/80"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{park.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {getParkTypeDisplayName(park)}
                        </span>
                      </span>
                    </button>
                    {isParksMapPage && (
                      <Link
                        href={appRoutes.park(park.slug)}
                        onClick={() => {
                          setQuery("");
                          setIsOpen(false);
                          setIsMobileOpen(false);
                        }}
                        className="shrink-0 rounded-full border border-sky-200/70 bg-white/72 px-2.5 py-1 text-xs font-medium text-cyan-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-sky-300/15 dark:bg-slate-900/72 dark:text-sky-100 dark:hover:bg-slate-900"
                      >
                        {t("openParkPage")}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
