"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";
import { formatFinnishDate } from "@/lib/fi-date";
import type { ParkAreaList } from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";
import { appRoutes } from "@/lib/routes";

type Area = ParkAreaList["areas"][number];
type Conflict =
  paths["/api/admin/parks/{slug}/subareas/{areaId}"]["delete"]["responses"][409]["content"]["application/json"];
type SearchResponse =
  paths["/api/admin/parks/{slug}/subarea-candidates"]["get"]["responses"][200]["content"]["application/json"];

const editorLink =
  "inline-flex min-h-11 items-center font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export const ParkAreas = ({ slug, initialAreas }: { slug: string; initialAreas: Area[] }) => {
  const t = useTranslations("controlPanel.parks.edit.parkAreas");
  const router = useRouter();
  const searchInput = useRef<HTMLInputElement>(null);
  const [areas, setAreas] = useState(initialAreas);
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [visits, setVisits] = useState<Conflict["visits"]>([]);
  const [staleSlug, setStaleSlug] = useState<string | null>(null);
  const path = `/api/admin/parks/${encodeURIComponent(slug)}`;
  const statusText = pending ? t("loading") : success;
  const linkedIds = new Set(areas.map(({ id }) => id));

  const search = async (term: string, offset = 0) => {
    setPending(true);
    setError("");
    setVisits([]);
    setSuccess("");
    try {
      const params = new URLSearchParams({ q: term, offset: String(offset) });
      const next = await apiFetch<SearchResponse>(`${path}/subarea-candidates?${params}`);
      setResults((current) =>
        offset > 0 && current ? { ...next, areas: [...current.areas, ...next.areas] } : next,
      );
      setSearchedQuery(term);
    } catch {
      setError(t("searchFailed"));
    } finally {
      setPending(false);
    }
  };

  const refresh = async (areaSlug: string) => {
    const ok = await revalidatePublicCache({
      parkSlugs: [slug, areaSlug],
      expireImmediately: true,
    });
    setStaleSlug(ok ? null : areaSlug);
    if (ok) router.refresh();
  };

  const update = async (area: Area, include: boolean) => {
    if (!window.confirm(t(include ? "confirmAdd" : "confirmRemove", { name: area.name }))) return;
    setPending(true);
    setError("");
    setVisits([]);
    setSuccess("");
    try {
      const updated = await apiFetch<Area>(`${path}/subareas/${area.id}`, {
        method: include ? "PUT" : "DELETE",
      });
      setAreas((current) => {
        const others = current.filter(({ id }) => id !== updated.id);
        return include
          ? [...others, updated].sort((first, second) =>
              first.name.localeCompare(second.name, "fi-FI"),
            )
          : others;
      });
      setSuccess(t(include ? "added" : "removed", { name: area.name }));
      await refresh(updated.slug);
      searchInput.current?.focus();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        const conflict = cause.details as Conflict;
        setVisits(conflict.visits);
        setError(t(include ? "visitsPreventAdd" : "visitsPreventRemove", { name: area.name }));
      } else {
        setError(t("updateFailed"));
      }
    } finally {
      setPending(false);
    }
  };

  const badge = (area: Area) =>
    !area.active || area.removed ? (
      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
        {t(area.active ? "activeHidden" : "inactive")}
      </span>
    ) : null;

  return (
    <section
      className="mt-6 max-w-3xl rounded-2xl border border-border bg-control p-4"
      aria-labelledby="park-areas-title"
    >
      <h2 id="park-areas-title" className="text-lg font-semibold">
        {t("title")}
      </h2>
      {areas.length === 0 ? (
        <p className="mt-3 text-sm">{t("empty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {areas.map((area) => (
            <li key={area.id} className="flex flex-wrap items-center gap-2">
              <Link href={appRoutes.controlPanel.parkEdit(area.slug)} className={editorLink}>
                {area.name}
              </Link>
              {badge(area)}
              <Button
                type="button"
                variant="outline"
                className="ml-auto min-h-11"
                disabled={pending || staleSlug !== null}
                onClick={() => void update(area, false)}
                aria-label={t("removeLabel", { name: area.name })}
              >
                {t("remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-5 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void search(query.trim());
        }}
      >
        <label htmlFor="park-area-search" className="block text-sm font-medium">
          {t("searchLabel")}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            ref={searchInput}
            id="park-area-search"
            type="search"
            maxLength={100}
            value={query}
            onChange={({ target }) => setQuery(target.value)}
            className="min-w-0 flex-1 rounded-xl border border-input bg-control px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          <Button type="submit" disabled={pending}>
            {t("search")}
          </Button>
        </div>
      </form>
      {statusText.length > 0 && (
        <p role="status" className="mt-3 text-sm">
          {statusText}
        </p>
      )}
      {error.length > 0 && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {visits.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {visits.map((visit) => (
            <li key={visit.id}>
              <Link className={editorLink} href={appRoutes.controlPanel.editVisit(visit.id)}>
                {t("editVisit", { date: formatFinnishDate(visit.visitedOn) })}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {staleSlug !== null && (
        <div className="mt-3">
          <p role="alert" className="text-sm">
            {t("refreshFailed")}
          </p>
          <Button
            type="button"
            variant="outline"
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
        <div className="mt-3 space-y-2">
          {results.areas.length === 0 ? (
            <p>{t("noResults")}</p>
          ) : (
            <ul className="space-y-2">
              {results.areas.map((area) => (
                <li key={area.id} className="flex flex-wrap items-center gap-2">
                  <span>{area.name}</span>
                  {badge(area)}
                  {linkedIds.has(area.id) ? (
                    <span className="text-sm">{t("alreadyLinked")}</span>
                  ) : area.blockedBy !== null && area.blockedBy !== "has_visits" ? (
                    <span className="text-sm text-muted-foreground">
                      {t(`blocked.${area.blockedBy}`)}
                    </span>
                  ) : (
                    <>
                      {area.blockedBy === "has_visits" && (
                        <span className="text-sm text-muted-foreground">
                          {t("blocked.has_visits")}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="ml-auto min-h-11"
                        disabled={pending || staleSlug !== null}
                        onClick={() => void update(area, true)}
                        aria-label={t("addLabel", { name: area.name })}
                      >
                        {t("add")}
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {results.nextOffset !== null && (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => void search(searchedQuery, results.nextOffset ?? 0)}
            >
              {t("more")}
            </Button>
          )}
        </div>
      )}
    </section>
  );
};
