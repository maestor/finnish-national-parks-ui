"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";
import { formatFinnishDate } from "@/lib/fi-date";
import { revalidatePublicCache } from "@/lib/public-cache";
import { appRoutes } from "@/lib/routes";

type LinkResponse =
  paths["/api/admin/parks/{slug}/trails"]["get"]["responses"][200]["content"]["application/json"];
type Trail = LinkResponse["trails"][number];
type VisitConflict =
  paths["/api/admin/parks/{slug}/trails/{trailId}"]["delete"]["responses"][409]["content"]["application/json"];
type SearchResponse =
  paths["/api/admin/parks/{slug}/trail-candidates"]["get"]["responses"][200]["content"]["application/json"];

export const AreaTrails = ({ slug, initialTrails }: { slug: string; initialTrails: Trail[] }) => {
  const t = useTranslations("controlPanel.parks.edit.areaTrails");
  const [trails, setTrails] = useState(initialTrails);
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [blockingVisits, setBlockingVisits] = useState<VisitConflict["visits"]>([]);
  const [staleSlug, setStaleSlug] = useState<string | null>(null);
  const effectiveTrails = trails.filter((trail) => trail.effective);

  const search = async (term: string, offset = 0) => {
    setPending(true);
    setError("");
    setBlockingVisits([]);
    try {
      const params = new URLSearchParams({ q: term, offset: String(offset), limit: "25" });
      const response = await apiFetch<SearchResponse>(
        `/api/admin/parks/${encodeURIComponent(slug)}/trail-candidates?${params}`,
      );
      setResults((current) =>
        offset > 0 && current
          ? { ...response, trails: [...current.trails, ...response.trails] }
          : response,
      );
      setSearchedQuery(term);
    } catch {
      setError(t("searchFailed"));
    } finally {
      setPending(false);
    }
  };

  const refresh = async (trailSlug: string) => {
    const outcomes = await Promise.all([
      revalidatePublicCache({ parkSlug: slug, expireImmediately: true }),
      revalidatePublicCache({ parkSlug: trailSlug, expireImmediately: true }),
    ]);
    setStaleSlug(outcomes.every(Boolean) ? null : trailSlug);
  };

  const update = async (
    trail: { trailId: number; name: string; slug: string },
    include: boolean,
  ) => {
    if (
      !window.confirm(
        t(include ? "confirmAdd" : "confirmRemove", { name: trail.name, slug: trail.slug }),
      )
    )
      return;
    setPending(true);
    setError("");
    setBlockingVisits([]);
    try {
      const updated = await apiFetch<Trail>(
        `/api/admin/parks/${encodeURIComponent(slug)}/trails/${trail.trailId}`,
        { method: include ? "PUT" : "DELETE" },
      );
      setTrails((current) =>
        [...current.filter((item) => item.trailId !== updated.trailId), updated].sort((a, b) =>
          a.name.localeCompare(b.name, "fi-FI"),
        ),
      );
      await refresh(trail.slug);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        const conflict = cause.details as VisitConflict;
        setBlockingVisits(conflict.visits);
        setError(t("visitsPreventRemove", { name: trail.name }));
      } else {
        setError(
          cause instanceof Error && cause.message.includes("requires a preservation decision")
            ? t("visitsPreventAdd")
            : t("updateFailed"),
        );
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      className="mt-6 max-w-3xl rounded-2xl border border-border bg-control p-4"
      aria-labelledby="area-trails-title"
    >
      <h2 id="area-trails-title" className="text-lg font-semibold">
        {t("title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      {effectiveTrails.length === 0 ? (
        <p className="mt-3 text-sm">{t("empty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {effectiveTrails.map((trail) => (
            <li key={trail.trailId} className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={appRoutes.controlPanel.parkEdit(trail.slug)}
                className="inline-block py-1 font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {trail.name}
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || staleSlug !== null}
                onClick={() => update(trail, false)}
                aria-label={t("removeLabel", { name: trail.name, slug: trail.slug })}
              >
                {t("remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {blockingVisits.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-control p-3">
          <h3 className="font-semibold">{t("reviewVisits")}</h3>
          <ul className="mt-2 flex flex-wrap gap-3">
            {blockingVisits.map((visit) => (
              <li key={visit.id}>
                <Link
                  href={appRoutes.controlPanel.editVisit(visit.id)}
                  className="inline-flex min-h-11 items-center rounded-md px-2 text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {formatFinnishDate(visit.visitedOn)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <form
        className="mt-5 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void search(query.trim());
        }}
      >
        <label htmlFor="area-trail-search" className="block text-sm font-medium">
          {t("searchLabel")}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="area-trail-search"
            type="search"
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-input bg-control px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          <Button type="submit" disabled={pending}>
            {t("search")}
          </Button>
        </div>
      </form>
      {pending === true && (
        <p role="status" className="mt-2 text-sm">
          {t("loading")}
        </p>
      )}
      {error.length > 0 && (
        <p role="alert" className="mt-2 text-sm">
          {error}
        </p>
      )}
      {staleSlug !== null && (
        <div role="alert" className="mt-2 text-sm">
          <p>{t("refreshFailed")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              setPending(true);
              void refresh(staleSlug).finally(() => setPending(false));
            }}
          >
            {t("retryRefresh")}
          </Button>
        </div>
      )}
      {results !== null && (
        <div className="mt-3">
          {results.trails.length === 0 ? (
            <p className="text-sm">{t("noResults")}</p>
          ) : (
            <ul className="space-y-2">
              {results.trails.map((trail) => (
                <li
                  key={trail.trailId}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span>
                    {trail.name}{" "}
                    <span className="text-sm text-muted-foreground">({trail.slug})</span>
                  </span>
                  {effectiveTrails.some((item) => item.trailId === trail.trailId) ? (
                    <span className="text-sm text-muted-foreground">{t("alreadyLinked")}</span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending || staleSlug !== null}
                      onClick={() => update(trail, true)}
                      aria-label={t("addLabel", { name: trail.name, slug: trail.slug })}
                    >
                      {t("add")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {results.nextOffset !== null && (
            <Button
              className="mt-3"
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                void search(searchedQuery, results.nextOffset ?? 0);
              }}
            >
              {t("more")}
            </Button>
          )}
        </div>
      )}
    </section>
  );
};
