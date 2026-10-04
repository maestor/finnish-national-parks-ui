"use client";

import { Search, Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";
import { cn } from "@/lib/cn";
import { formatFinnishDate } from "@/lib/fi-date";
import { revalidatePublicCache } from "@/lib/public-cache";

export type HomeFeaturedVisitSelection =
  paths["/api/admin/home-featured-visit"]["get"]["responses"][200]["content"]["application/json"];

const VISIT_BATCH_SIZE = 10;

type SaveStatus = "saved" | "saveFailed" | "cacheFailed" | null;

export const HomeFeaturedVisitSettings = ({
  initialSelection,
}: {
  initialSelection: HomeFeaturedVisitSelection;
}) => {
  const t = useTranslations("controlPanel.dashboard.featuredVisit");
  const [visitId, setVisitId] = useState(initialSelection.visitId);
  const [savedVisitId, setSavedVisitId] = useState(visitId);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<SaveStatus>(null);
  const { candidates } = initialSelection;
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(VISIT_BATCH_SIZE);
  const selectedVisit = candidates.find((visit) => visit.id === visitId);
  const searchTerms = query.trim().toLocaleLowerCase("fi-FI").split(/\s+/).filter(Boolean);
  const filteredVisits = candidates.filter((visit) => {
    const searchableText =
      `${visit.park.name} ${visit.visitedOn} ${formatFinnishDate(visit.visitedOn)}`.toLocaleLowerCase(
        "fi-FI",
      );
    return searchTerms.every((term) => searchableText.includes(term));
  });
  const visibleVisits = filteredVisits.slice(0, visibleCount);

  const refreshCache = async () => {
    const refreshed = await revalidatePublicCache({ expireImmediately: true });
    setStatus(refreshed ? "saved" : "cacheFailed");
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await apiFetch("/api/admin/home-featured-visit", {
        method: "PATCH",
        body: JSON.stringify({ visitId }),
      });
      setSavedVisitId(visitId);
      await refreshCache();
    } catch {
      setStatus("saveFailed");
    } finally {
      setBusy(false);
    }
  };

  const retryCache = async () => {
    setBusy(true);
    await refreshCache();
    setBusy(false);
  };

  return (
    <section
      aria-labelledby="home-featured-visit-settings-title"
      className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <h2
        id="home-featured-visit-settings-title"
        className="flex items-center gap-2 text-lg font-semibold"
      >
        <Star className="h-5 w-5 text-icon" aria-hidden="true" />
        {t("title")}
      </h2>
      <p id="home-featured-visit-help" className="mt-2 text-sm text-muted-foreground">
        {t("description")}
      </p>
      <section
        aria-labelledby="home-selected-visit-title"
        className="mt-5 rounded-xl border border-border bg-control p-4"
      >
        <h3 id="home-selected-visit-title" className="text-sm font-semibold">
          {t("selectedTitle")}
        </h3>
        {selectedVisit ? (
          <div className="mt-2">
            <p className="break-words font-medium">{selectedVisit.park.name}</p>
            <time dateTime={selectedVisit.visitedOn} className="text-sm text-muted-foreground">
              {formatFinnishDate(selectedVisit.visitedOn)}
            </time>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {t(visitId === null ? "none" : "unavailable")}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          disabled={busy || visitId === null}
          onClick={() => {
            setVisitId(null);
            setStatus(null);
          }}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {t("clear")}
        </Button>
      </section>

      <fieldset
        disabled={busy}
        aria-describedby="home-featured-visit-help"
        className="mt-5 min-w-0 space-y-3"
      >
        <legend className="text-sm font-semibold">{t("label")}</legend>
        <div className="space-y-2">
          <label htmlFor="home-visit-search" className="block text-sm font-medium">
            {t("searchLabel")}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-icon"
              aria-hidden="true"
            />
            <input
              id="home-visit-search"
              type="search"
              value={query}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-xl border border-input bg-control pr-3 pl-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(VISIT_BATCH_SIZE);
              }}
            />
          </div>
        </div>
        <p role="status" aria-label={t("resultsLabel")} className="text-sm text-muted-foreground">
          {t("resultCount", { shown: visibleVisits.length, total: filteredVisits.length })}
        </p>
        {visibleVisits.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t(candidates.length === 0 ? "empty" : "noResults")}
          </p>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto rounded-xl p-1">
            {visibleVisits.map((visit) => (
              <label
                key={visit.id}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                  visitId === visit.id
                    ? "border-input bg-accent"
                    : "border-border bg-control hover:bg-accent",
                )}
              >
                <input
                  type="radio"
                  name="home-featured-visit"
                  value={visit.id}
                  checked={visitId === visit.id}
                  onChange={() => {
                    setVisitId(visit.id);
                    setStatus(null);
                  }}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-medium">{visit.park.name}</span>
                  <time dateTime={visit.visitedOn} className="block text-sm text-muted-foreground">
                    {formatFinnishDate(visit.visitedOn)}
                  </time>
                </span>
              </label>
            ))}
          </div>
        )}
        {filteredVisits.length > VISIT_BATCH_SIZE && (
          <Button
            type="button"
            variant="outline"
            disabled={visibleCount >= filteredVisits.length}
            onClick={() => setVisibleCount((count) => count + VISIT_BATCH_SIZE)}
          >
            {t("showMore")}
          </Button>
        )}
      </fieldset>
      <form onSubmit={save} className="mt-5">
        <Button type="submit" disabled={busy || visitId === savedVisitId}>
          {t(busy ? "saving" : "save")}
        </Button>
      </form>
      {status !== null && (
        <p role={status === "saved" ? "status" : "alert"} className="mt-4 text-sm">
          {t(status)}
        </p>
      )}
      {status === "cacheFailed" && (
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          disabled={busy}
          onClick={retryCache}
        >
          {t("retryCache")}
        </Button>
      )}
    </section>
  );
};
