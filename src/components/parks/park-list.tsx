"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { AdminTableFilters } from "@/components/admin/admin-table-filters";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { type AdminVisibilityPark, getParkTypeDisplayName } from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";
import { appRoutes } from "@/lib/routes";

interface ParkListProps {
  parks: AdminVisibilityPark[];
  removedParks: AdminVisibilityPark[];
}

type ParkTab = "visible" | "hidden";

export const ParkList = ({ parks, removedParks }: ParkListProps) => {
  const t = useTranslations("controlPanel.parks");
  const [localParks, setLocalParks] = useState(parks);
  const [localRemovedParks, setLocalRemovedParks] = useState(removedParks);
  const [activeTab, setActiveTab] = useState<ParkTab>("visible");
  const [query, setQuery] = useState("");
  const [selectedTypeSlug, setSelectedTypeSlug] = useState("");
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setLocalParks(parks);
  }, [parks]);

  useEffect(() => {
    setLocalRemovedParks(removedParks);
  }, [removedParks]);

  const sortedParks = useMemo(() => {
    return [...localParks].sort((left, right) => left.name.localeCompare(right.name, "fi-FI"));
  }, [localParks]);

  const sortedRemovedParks = useMemo(() => {
    return [...localRemovedParks].sort((left, right) =>
      left.name.localeCompare(right.name, "fi-FI"),
    );
  }, [localRemovedParks]);

  const typeOptions = useMemo(() => {
    const typeEntries = [...localParks, ...localRemovedParks].map((park) => park.type);
    const uniqueTypes = Array.from(
      new Map(typeEntries.map((type) => [type.slug, type])).values(),
    ).sort((left, right) => left.name.localeCompare(right.name, "fi-FI"));

    return [
      { label: t("filters.allTypes"), value: "" },
      ...uniqueTypes.map((type) => ({
        label: type.name,
        value: type.slug,
      })),
    ];
  }, [localParks, localRemovedParks, t]);

  const updateParkVisibility = async (park: AdminVisibilityPark, removed: boolean) => {
    const confirmed = window.confirm(
      t(removed ? "confirmRemove" : "confirmRestore", {
        parkName: park.name,
      }),
    );

    if (!confirmed) {
      return;
    }

    setPendingSlug(park.slug);
    setActionError(null);

    try {
      await apiFetch(`/api/parks/${park.slug}/removed`, {
        method: "PATCH",
        body: JSON.stringify({ removed }),
      });

      await revalidatePublicCache({ parkSlug: park.slug });
      if (removed) {
        setLocalParks((current) => current.filter((currentPark) => currentPark.slug !== park.slug));
        setLocalRemovedParks((current) => [...current, park]);
      } else {
        setLocalRemovedParks((current) =>
          current.filter((currentPark) => currentPark.slug !== park.slug),
        );
        setLocalParks((current) => [...current, park]);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingSlug(null);
    }
  };

  const displayedParks = activeTab === "visible" ? sortedParks : sortedRemovedParks;
  const normalizedQuery = query.trim().toLocaleLowerCase("fi-FI");
  const filteredParks = displayedParks.filter((park) => {
    const matchesType = selectedTypeSlug ? park.type.slug === selectedTypeSlug : true;
    const haystack = [park.name, park.address, getParkTypeDisplayName(park), park.type.name]
      .join(" ")
      .toLocaleLowerCase("fi-FI");
    const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;

    return matchesType && matchesQuery;
  });
  const notice = activeTab === "visible" ? t("visibleNotice") : t("hiddenNotice");
  const resultCountLabel = t("filters.results", { count: filteredParks.length });
  const hasActionError = actionError !== null;

  if (sortedParks.length === 0 && sortedRemovedParks.length === 0) {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-white/45 bg-white/48 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/38">
        <p className="text-muted-foreground">{t("emptyAll")}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div
        className="inline-flex rounded-[1.2rem] border border-white/45 bg-white/56 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/42 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        role="tablist"
        aria-label={t("tabs.ariaLabel")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "visible"}
          onClick={() => setActiveTab("visible")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "visible"
              ? "bg-white/86 text-foreground shadow-[0_10px_20px_rgba(148,163,184,0.16)] dark:bg-slate-950/68"
              : "text-muted-foreground hover:bg-white/62 hover:text-foreground dark:hover:bg-slate-950/56"
          }`}
        >
          {t("tabs.visible")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "hidden"}
          onClick={() => setActiveTab("hidden")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "hidden"
              ? "bg-white/86 text-foreground shadow-[0_10px_20px_rgba(148,163,184,0.16)] dark:bg-slate-950/68"
              : "text-muted-foreground hover:bg-white/62 hover:text-foreground dark:hover:bg-slate-950/56"
          }`}
        >
          {t("tabs.hidden")}
        </button>
      </div>

      <p className="rounded-[1.3rem] border border-amber-500/25 bg-[linear-gradient(118deg,rgba(245,158,11,0.16),rgba(251,191,36,0.08))] px-4 py-3 text-sm text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:border-amber-300/18 dark:bg-[linear-gradient(118deg,rgba(245,158,11,0.16),rgba(120,53,15,0.08))] dark:text-amber-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        {notice}
      </p>

      <AdminTableFilters
        query={query}
        onQueryChange={setQuery}
        queryLabel={t("filters.searchLabel")}
        queryPlaceholder={t("filters.searchPlaceholder")}
        resultCountLabel={resultCountLabel}
        resetLabel={t("filters.reset")}
        onReset={() => {
          setQuery("");
          setSelectedTypeSlug("");
        }}
        selects={[
          {
            id: "parks-type-filter",
            label: t("filters.typeLabel"),
            options: typeOptions,
            value: selectedTypeSlug,
            onChange: setSelectedTypeSlug,
          },
        ]}
      />

      {hasActionError && (
        <p
          className="rounded-[1.3rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          role="alert"
        >
          {actionError}
        </p>
      )}

      {displayedParks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/45 bg-white/48 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/38">
          <p className="text-muted-foreground">
            {activeTab === "visible" ? t("emptyVisible") : t("emptyHidden")}
          </p>
        </div>
      ) : filteredParks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/45 bg-white/48 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/38">
          <p className="text-muted-foreground">{t("emptyFiltered")}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.6rem] border border-white/45 bg-white/56 shadow-[0_18px_36px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/38 dark:shadow-[0_22px_40px_rgba(2,6,23,0.28)]">
          <table className="w-full text-sm">
            <thead className="bg-white/74 dark:bg-slate-950/56">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t("parkName")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("parkType")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("location")}</th>
                <th className="px-4 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/30 dark:divide-white/8">
              {filteredParks.map((park) => {
                const isUpdating = pendingSlug === park.slug;
                const isVisibleTab = activeTab === "visible";

                return (
                  <tr
                    key={park.slug}
                    className="transition-colors hover:bg-white/56 dark:hover:bg-slate-950/42"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={
                          isVisibleTab
                            ? appRoutes.controlPanel.parkEdit(park.slug)
                            : appRoutes.park(park.slug)
                        }
                        className="font-medium hover:underline"
                      >
                        {park.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{getParkTypeDisplayName(park)}</td>
                    <td className="px-4 py-3">{park.address}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant={isVisibleTab ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => updateParkVisibility(park, isVisibleTab)}
                        disabled={isUpdating}
                      >
                        {isUpdating
                          ? isVisibleTab
                            ? t("removing")
                            : t("restoring")
                          : isVisibleTab
                            ? t("removeAction")
                            : t("restoreAction")}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
