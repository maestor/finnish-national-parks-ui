"use client";

import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Park } from "@/lib/parks";
import { MapPin, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const MAX_RESULTS = 8;

export const HomeParkSearch = () => {
  const t = useTranslations("layout.parkSearch");
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [parks, setParks] = useState<Park[]>([]);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    apiFetch<{ parks: Park[] }>("/api/parks")
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
            const haystacks = [park.name, park.type.name, park.locationLabel];
            return haystacks.some((value) =>
              value.toLocaleLowerCase("fi-FI").includes(trimmedQuery),
            );
          });

    return filteredParks.slice(0, MAX_RESULTS);
  }, [parks, query]);

  const navigateToPark = (park: Park) => {
    setQuery("");
    setIsOpen(false);
    setIsMobileOpen(false);
    router.push(`/park/${park.slug}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
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
      navigateToPark(results[highlightedIndex]);
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
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
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
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
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
          className="h-9 w-full rounded-full border border-border bg-background/90 pl-9 pr-3 text-sm text-foreground shadow-sm backdrop-blur transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          className="fixed left-4 right-4 top-16 z-50 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl md:absolute md:left-0 md:right-0 md:top-[calc(100%+0.5rem)]"
        >
          {isMobileOpen && (
            <div className="border-b border-border p-2 md:hidden">
              <label htmlFor="home-park-search-mobile" className="sr-only">
                {t("label")}
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
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
                  className="h-9 w-full rounded-full border border-border bg-background/90 pl-9 pr-3 text-sm text-foreground shadow-sm backdrop-blur transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            <ul className="py-1">
              {results.map((park, index) => (
                <li key={park.slug}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => navigateToPark(park)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors",
                      highlightedIndex === index
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{park.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {park.type.name}
                        {park.locationLabel ? ` · ${park.locationLabel}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
