"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AdminTableFilters } from "@/components/admin/admin-table-filters";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { VisitWithPark } from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";
import type { Trip } from "@/lib/trips";

interface TripVisitAssignmentsProps {
  trip: Trip;
  visits: VisitWithPark[];
}

export const TripVisitAssignments = ({ trip, visits }: TripVisitAssignmentsProps) => {
  const t = useTranslations("controlPanel.trips.assignments");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedParkSlug, setSelectedParkSlug] = useState("");
  const [visitsState, setVisitsState] = useState(visits);
  const [pendingVisitId, setPendingVisitId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sortedVisits = useMemo(() => {
    return [...visitsState].sort(
      (left, right) => new Date(right.visitedOn).getTime() - new Date(left.visitedOn).getTime(),
    );
  }, [visitsState]);

  const parkOptions = useMemo(() => {
    const uniqueParks = Array.from(
      new Map(sortedVisits.map((visit) => [visit.park.slug, visit.park])).values(),
    ).sort((left, right) => left.name.localeCompare(right.name, "fi-FI"));

    return [
      { label: t("filters.allParks"), value: "" },
      ...uniqueParks.map((park) => ({
        label: park.name,
        value: park.slug,
      })),
    ];
  }, [sortedVisits, t]);

  const normalizedQuery = query.trim().toLocaleLowerCase("fi-FI");

  const matchesBaseFilters = (visit: VisitWithPark) => {
    const matchesPark = selectedParkSlug ? visit.park.slug === selectedParkSlug : true;
    const haystack = [
      visit.park.name,
      visit.route ?? "",
      visit.trip?.name ?? "",
      visit.visitedOn,
      visit.author ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase("fi-FI");
    const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;

    return matchesPark && matchesQuery;
  };

  const assignedVisits = sortedVisits.filter(
    (visit) => visit.trip?.id === trip.id && matchesBaseFilters(visit),
  );

  const availableVisits = sortedVisits.filter(
    (visit) => visit.trip === null && matchesBaseFilters(visit),
  );

  const handleTripAssignment = async (visit: VisitWithPark, nextTripId: number | null) => {
    setPendingVisitId(visit.id);
    setActionError(null);

    try {
      await apiFetch(`/api/visits/${visit.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          tripId: nextTripId,
        }),
      });
      await revalidatePublicCache({ parkSlug: visit.park.slug });
      setVisitsState((currentVisits) =>
        currentVisits.map((currentVisit) => {
          if (currentVisit.id !== visit.id) {
            return currentVisit;
          }

          return {
            ...currentVisit,
            trip: nextTripId ? { id: trip.id, name: trip.name } : null,
          };
        }),
      );
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingVisitId(null);
    }
  };

  const renderVisitRow = (
    visit: VisitWithPark,
    actionLabel: string,
    onAction: () => Promise<void>,
  ) => (
    <tr key={visit.id} className="transition-colors hover:bg-white/56 dark:hover:bg-slate-950/42">
      <td className="px-4 py-3">
        <div className="space-y-1">
          <p className="font-medium">{visit.park.name}</p>
          {visit.route ? <p className="text-sm text-muted-foreground">{visit.route}</p> : null}
        </div>
      </td>
      <td className="w-[125px] px-4 py-3 align-top whitespace-nowrap">{visit.visitedOn}</td>
      <td className="px-4 py-3 text-right">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void onAction()}
          disabled={pendingVisitId === visit.id}
        >
          {pendingVisitId === visit.id ? "..." : actionLabel}
        </Button>
      </td>
    </tr>
  );

  return (
    <section className="mt-10 space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t("title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      <AdminTableFilters
        query={query}
        onQueryChange={setQuery}
        queryLabel={t("filters.searchLabel")}
        queryPlaceholder={t("filters.searchPlaceholder")}
        resultCountLabel={t("filters.results", {
          assigned: assignedVisits.length,
          available: availableVisits.length,
        })}
        resetLabel={t("filters.reset")}
        onReset={() => {
          setQuery("");
          setSelectedParkSlug("");
        }}
        selects={[
          {
            id: "trip-visits-park-filter",
            label: t("filters.parkLabel"),
            options: parkOptions,
            value: selectedParkSlug,
            onChange: setSelectedParkSlug,
          },
        ]}
      />

      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-3 rounded-[1.6rem] border border-white/45 bg-white/56 p-4 shadow-[0_18px_36px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/38 dark:shadow-[0_22px_40px_rgba(2,6,23,0.28)]">
          <div>
            <h3 className="text-lg font-semibold">{t("assignedTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("assignedDescription", { count: assignedVisits.length })}
            </p>
          </div>

          {assignedVisits.length === 0 ? (
            <div className="rounded-[1.3rem] border border-dashed border-white/45 bg-white/40 p-6 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-950/28">
              {t("assignedEmpty")}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.3rem] border border-white/35 dark:border-white/8">
              <table className="w-full text-sm">
                <thead className="bg-white/70 dark:bg-slate-950/52">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t("table.park")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("table.date")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/30 dark:divide-white/8">
                  {assignedVisits.map((visit) =>
                    renderVisitRow(visit, t("removeAction"), async () =>
                      handleTripAssignment(visit, null),
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-[1.6rem] border border-white/45 bg-white/56 p-4 shadow-[0_18px_36px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/38 dark:shadow-[0_22px_40px_rgba(2,6,23,0.28)]">
          <div>
            <h3 className="text-lg font-semibold">{t("availableTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("availableDescription", { count: availableVisits.length })}
            </p>
          </div>

          {availableVisits.length === 0 ? (
            <div className="rounded-[1.3rem] border border-dashed border-white/45 bg-white/40 p-6 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-950/28">
              {t("availableEmpty")}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.3rem] border border-white/35 dark:border-white/8">
              <table className="w-full text-sm">
                <thead className="bg-white/70 dark:bg-slate-950/52">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">{t("table.park")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("table.date")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/30 dark:divide-white/8">
                  {availableVisits.map((visit) =>
                    renderVisitRow(visit, t("attachAction"), async () =>
                      handleTripAssignment(visit, trip.id),
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};
