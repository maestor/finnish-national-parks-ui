"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AdminTableFilters } from "@/components/admin/admin-table-filters";
import { EditIconLink } from "@/components/admin/edit-icon-link";
import { appRoutes } from "@/lib/routes";
import { formatTripDateRange, sortTrips, type Trip } from "@/lib/trips";

interface TripManagementProps {
  trips: Trip[];
}

export const TripManagement = ({ trips }: TripManagementProps) => {
  const t = useTranslations("controlPanel.trips.list");
  const [query, setQuery] = useState("");

  const sortedTrips = useMemo(() => sortTrips(trips), [trips]);
  const normalizedQuery = query.trim().toLocaleLowerCase("fi-FI");

  const filteredTrips = sortedTrips.filter((trip) => {
    const haystack = [trip.name, formatTripDateRange(trip) ?? ""]
      .join(" ")
      .toLocaleLowerCase("fi-FI");

    return normalizedQuery ? haystack.includes(normalizedQuery) : true;
  });

  if (sortedTrips.length === 0) {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-white/45 bg-white/48 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/38">
        <p className="text-muted-foreground">{t("noTrips")}</p>
        <Link
          href={appRoutes.controlPanel.newTrip}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("addFirstTrip")}
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
        resultCountLabel={t("filters.results", { count: filteredTrips.length })}
        resetLabel={t("filters.reset")}
        onReset={() => setQuery("")}
      />

      {filteredTrips.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/45 bg-white/48 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/38">
          <p className="text-muted-foreground">{t("emptyFiltered")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.6rem] border border-white/45 bg-white/56 shadow-[0_18px_36px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/38 dark:shadow-[0_22px_40px_rgba(2,6,23,0.28)]">
          <table className="w-full text-sm">
            <thead className="bg-white/74 dark:bg-slate-950/56">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t("tripName")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("dateRange")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("visitCount")}</th>
                <th className="px-4 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/30 dark:divide-white/8">
              {filteredTrips.map((trip) => (
                <tr
                  key={trip.id}
                  className="transition-colors hover:bg-white/56 dark:hover:bg-slate-950/42"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={appRoutes.controlPanel.editTrip(trip.id)}
                      className="hover:underline"
                    >
                      {trip.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatTripDateRange(trip) ?? t("noDateRange")}</td>
                  <td className="px-4 py-3">{t("visitCountValue", { count: trip.visitCount })}</td>
                  <td className="px-4 py-3 text-right">
                    <EditIconLink
                      href={appRoutes.controlPanel.editTrip(trip.id)}
                      label={t("edit")}
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
