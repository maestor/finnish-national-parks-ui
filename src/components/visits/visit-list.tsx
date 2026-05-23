"use client";

import { AdminTableFilters } from "@/components/admin/admin-table-filters";
import { EditVisitLink } from "@/components/visits/edit-visit-link";
import type { VisitWithPark } from "@/lib/parks";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";

interface VisitListProps {
  visits: VisitWithPark[];
}

export const VisitList = ({ visits }: VisitListProps) => {
  const t = useTranslations("controlPanel.visits.list");
  const [query, setQuery] = useState("");
  const [selectedParkSlug, setSelectedParkSlug] = useState("");

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

  const normalizedQuery = query.trim().toLocaleLowerCase("fi-FI");
  const filteredVisits = sortedVisits.filter((visit) => {
    const matchesPark = selectedParkSlug ? visit.park.slug === selectedParkSlug : true;
    const haystack = [visit.park.name, visit.route ?? "", visit.visitedOn]
      .join(" ")
      .toLocaleLowerCase("fi-FI");
    const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;

    return matchesPark && matchesQuery;
  });

  if (sortedVisits.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">{t("noVisits")}</p>
        <Link
          href="/control-panel/visits/new"
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
        }}
        selects={[
          {
            id: "visits-park-filter",
            label: t("filters.parkLabel"),
            options: parkOptions,
            value: selectedParkSlug,
            onChange: setSelectedParkSlug,
          },
        ]}
      />

      {filteredVisits.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">{t("emptyFiltered")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t("parkName")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("route")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("visitDate")}</th>
                <th className="px-4 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredVisits.map((visit) => (
                <tr key={visit.id}>
                  <td className="px-4 py-3">
                    <Link href={`/park/${visit.park.slug}`} className="hover:underline">
                      {visit.park.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{visit.route ?? "–"}</td>
                  <td className="px-4 py-3">{visit.visitedOn}</td>
                  <td className="px-4 py-3 text-right">
                    <EditVisitLink
                      visitId={visit.id}
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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
