"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AdminTableFilters } from "@/components/admin/admin-table-filters";
import { EditVisitLink } from "@/components/visits/edit-visit-link";
import type { VisitWithPark } from "@/lib/parks";
import { appRoutes } from "@/lib/routes";

interface VisitListProps {
  visits: VisitWithPark[];
}

export const VisitList = ({ visits }: VisitListProps) => {
  const t = useTranslations("controlPanel.visits.list");
  const [query, setQuery] = useState("");
  const [selectedParkSlug, setSelectedParkSlug] = useState("");
  const [selectedTripId, setSelectedTripId] = useState("");
  const renderStatusBadge = (isComplete: boolean) => (
    <span
      className={`inline-flex min-w-20 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        isComplete
          ? "border-emerald-600/20 bg-emerald-600/10 text-emerald-900 dark:text-emerald-200"
          : "border-destructive/20 bg-destructive/10 text-destructive dark:border-rose-400/30 dark:bg-rose-400/12 dark:text-rose-200"
      }`}
    >
      <span
        aria-hidden="true"
        className={`mr-1.5 h-2 w-2 rounded-full ${isComplete ? "bg-emerald-600" : "bg-destructive dark:bg-rose-300"}`}
      />
      {isComplete ? t("complete") : t("missing")}
    </span>
  );

  const sortedVisits = useMemo(() => {
    return [...visits].sort(
      (a, b) => new Date(b.visitedOn).getTime() - new Date(a.visitedOn).getTime(),
    );
  }, [visits]);

  const parkOptions = useMemo(() => {
    const uniqueParks = Array.from(
      new Map(visits.map((visit) => [visit.park.slug, visit.park])).values(),
    ).sort((left, right) => left.name.localeCompare(right.name, "fi-FI"));

    return [
      { label: t("filters.allParks"), value: "" },
      ...uniqueParks.map((park) => ({
        label: park.name,
        value: park.slug,
      })),
    ];
  }, [t, visits]);

  const tripOptions = useMemo(() => {
    const uniqueTrips = Array.from(
      new Map(
        visits.flatMap((visit) => (visit.trip ? [[visit.trip.id, visit.trip]] : [])),
      ).values(),
    ).sort((left, right) => left.name.localeCompare(right.name, "fi-FI"));

    return [
      { label: t("filters.allTrips"), value: "" },
      { label: t("filters.unassignedTrips"), value: "none" },
      ...uniqueTrips.map((trip) => ({
        label: trip.name,
        value: String(trip.id),
      })),
    ];
  }, [t, visits]);

  const normalizedQuery = query.trim().toLocaleLowerCase("fi-FI");
  const filteredVisits = sortedVisits.filter((visit) => {
    const matchesPark = selectedParkSlug ? visit.park.slug === selectedParkSlug : true;
    const matchesTrip =
      selectedTripId === ""
        ? true
        : selectedTripId === "none"
          ? visit.trip === null
          : String(visit.trip?.id ?? "") === selectedTripId;
    const haystack = [visit.park.name, visit.trip?.name ?? "", visit.route ?? "", visit.visitedOn]
      .join(" ")
      .toLocaleLowerCase("fi-FI");
    const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;

    return matchesPark && matchesTrip && matchesQuery;
  });

  if (sortedVisits.length === 0) {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-white/45 bg-white/48 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/38">
        <p className="text-muted-foreground">{t("noVisits")}</p>
        <Link
          href={appRoutes.controlPanel.newVisit}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("addFirstVisit")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <AdminTableFilters
        query={query}
        onQueryChange={setQuery}
        queryLabel={t("filters.searchLabel")}
        queryPlaceholder={t("filters.searchPlaceholder")}
        resultCountLabel={t("filters.results", { count: filteredVisits.length })}
        resetLabel={t("filters.reset")}
        onReset={() => {
          setQuery("");
          setSelectedParkSlug("");
          setSelectedTripId("");
        }}
        selects={[
          {
            id: "visits-park-filter",
            label: t("filters.parkLabel"),
            options: parkOptions,
            value: selectedParkSlug,
            onChange: setSelectedParkSlug,
          },
          {
            id: "visits-trip-filter",
            label: t("filters.tripLabel"),
            options: tripOptions,
            value: selectedTripId,
            onChange: setSelectedTripId,
          },
        ]}
      />

      {filteredVisits.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/45 bg-white/48 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/38">
          <p className="text-muted-foreground">{t("emptyFiltered")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.6rem] border border-white/45 bg-white/56 shadow-[0_18px_36px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/38 dark:shadow-[0_22px_40px_rgba(2,6,23,0.28)]">
          <table className="w-full text-sm">
            <thead className="bg-white/74 dark:bg-slate-950/56">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t("parkName")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("trip")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("route")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("visitDate")}</th>
                <th className="px-4 py-3 text-center font-medium">{t("noteStatus")}</th>
                <th className="px-4 py-3 text-center font-medium">{t("imageStatus")}</th>
                <th className="px-4 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/30 dark:divide-white/8">
              {filteredVisits.map((visit) => (
                <tr
                  key={visit.id}
                  className="transition-colors hover:bg-white/56 dark:hover:bg-slate-950/42"
                >
                  <td className="px-4 py-3">
                    <Link href={appRoutes.park(visit.park.slug)} className="hover:underline">
                      {visit.park.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{visit.trip?.name ?? t("noTrip")}</td>
                  <td className="px-4 py-3">{visit.route ?? "–"}</td>
                  <td className="px-4 py-3">{visit.visitedOn}</td>
                  <td className="px-4 py-3 text-center">
                    {renderStatusBadge(Boolean(visit.note?.trim()))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {renderStatusBadge(visit.images.length > 0)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <EditVisitLink
                      visitId={visit.id}
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/72 hover:text-foreground dark:hover:bg-slate-950/58"
                      iconClassName="h-4 w-4"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
