"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AdminTableFilters } from "@/components/admin/admin-table-filters";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { revalidatePublicCache } from "@/lib/public-cache";
import { appRoutes, createPathWithSearchParams } from "@/lib/routes";
import { formatTripDateRange, sortTrips, type Trip } from "@/lib/trips";

interface TripManagementProps {
  trips: Trip[];
}

export const TripManagement = ({ trips }: TripManagementProps) => {
  const t = useTranslations("controlPanel.trips.list");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<number | null>(null);

  const sortedTrips = useMemo(() => sortTrips(trips), [trips]);
  const normalizedQuery = query.trim().toLocaleLowerCase("fi-FI");

  const filteredTrips = sortedTrips.filter((trip) => {
    const haystack = [trip.name, trip.description ?? "", formatTripDateRange(trip) ?? ""]
      .join(" ")
      .toLocaleLowerCase("fi-FI");

    return normalizedQuery ? haystack.includes(normalizedQuery) : true;
  });

  const handleDelete = async (trip: Trip) => {
    if (!window.confirm(t("deleteConfirm", { tripName: trip.name }))) {
      return;
    }

    setDeletingTripId(trip.id);
    setDeleteError(null);

    try {
      await apiFetch(`/api/trips/${trip.id}`, { method: "DELETE" });
      await revalidatePublicCache();
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : String(error));
    } finally {
      setDeletingTripId(null);
    }
  };

  if (sortedTrips.length === 0) {
    return (
      <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/45 bg-white/48 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/38">
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

      {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}

      {filteredTrips.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-white/45 bg-white/48 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/38">
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
                <th className="px-4 py-3 text-left font-medium">{t("description")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/30 dark:divide-white/8">
              {filteredTrips.map((trip) => (
                <tr
                  key={trip.id}
                  className="transition-colors hover:bg-white/56 dark:hover:bg-slate-950/42"
                >
                  <td className="px-4 py-3 font-medium">{trip.name}</td>
                  <td className="px-4 py-3">{formatTripDateRange(trip) ?? t("noDateRange")}</td>
                  <td className="px-4 py-3">{t("visitCountValue", { count: trip.visitCount })}</td>
                  <td className="px-4 py-3">{trip.description?.trim() || t("noDescription")}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={createPathWithSearchParams(appRoutes.controlPanel.newVisit, {
                          trip: trip.id,
                        })}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-white/45 bg-white/78 px-3 text-sm font-medium text-foreground shadow-[0_10px_24px_rgba(148,163,184,0.18)] backdrop-blur-md transition-colors hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[0_16px_32px_rgba(2,6,23,0.28)] dark:hover:bg-slate-950/74"
                      >
                        {t("addVisit")}
                      </Link>
                      <Link
                        href={appRoutes.controlPanel.editTrip(trip.id)}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-white/45 bg-white/78 px-3 text-sm font-medium text-foreground shadow-[0_10px_24px_rgba(148,163,184,0.18)] backdrop-blur-md transition-colors hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[0_16px_32px_rgba(2,6,23,0.28)] dark:hover:bg-slate-950/74"
                      >
                        {t("edit")}
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(trip)}
                        disabled={deletingTripId === trip.id}
                      >
                        {deletingTripId === trip.id ? "..." : t("delete")}
                      </Button>
                    </div>
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
