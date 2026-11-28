"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useEffect, useId, useMemo, useState } from "react";
import { AdminTableFilters } from "@/components/admin/admin-table-filters";
import { useSnackbar } from "@/components/providers/snackbar-provider";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import {
  type AdminLinkedArea,
  type AdminLinkedTrail,
  type AdminVisibilityPark,
  getParkTypeDisplayName,
} from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";
import { appRoutes } from "@/lib/routes";

interface ParkListProps {
  parks: AdminVisibilityPark[];
  removedParks: AdminVisibilityPark[];
  linkedTrails: AdminLinkedTrail[];
  linkedAreas?: AdminLinkedArea[];
}

const parkTabs = ["visible", "hidden", "linked"] as const;
type ParkTab = (typeof parkTabs)[number];
type ParkListRow = AdminVisibilityPark | AdminLinkedTrail | AdminLinkedArea;
const noLinkedAreas: AdminLinkedArea[] = [];

const tabCopy = {
  visible: { notice: "visibleNotice", empty: "emptyVisible" },
  hidden: { notice: "hiddenNotice", empty: "emptyHidden" },
  linked: { notice: "linkedNotice", empty: "emptyLinked" },
} as const;

export const ParkList = ({
  parks,
  removedParks,
  linkedTrails,
  linkedAreas = noLinkedAreas,
}: ParkListProps) => {
  const t = useTranslations("controlPanel.parks");
  const tabId = useId();
  const { showSnackbar } = useSnackbar();
  const [localParks, setLocalParks] = useState(parks);
  const [localRemovedParks, setLocalRemovedParks] = useState(removedParks);
  const [activeTab, setActiveTab] = useState<ParkTab>("visible");
  const [query, setQuery] = useState("");
  const [selectedTypeSlug, setSelectedTypeSlug] = useState("");
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  useEffect(() => {
    setLocalParks(parks);
  }, [parks]);

  useEffect(() => {
    setLocalRemovedParks(removedParks);
  }, [removedParks]);

  const parksByTab = useMemo(() => {
    const visibleSlugs = new Set(localParks.map((park) => park.slug));
    const linkedSlugs = new Set(linkedTrails.map((trail) => trail.slug));
    const byTab: Record<ParkTab, ParkListRow[]> = {
      visible: [...localParks],
      hidden: localRemovedParks.filter((park) => !linkedSlugs.has(park.slug)),
      linked: [...linkedTrails.filter((trail) => !visibleSlugs.has(trail.slug)), ...linkedAreas],
    };
    for (const tab of parkTabs) {
      byTab[tab].sort((left, right) => left.name.localeCompare(right.name, "fi-FI"));
    }
    return byTab;
  }, [localParks, localRemovedParks, linkedTrails, linkedAreas]);

  const typeOptions = useMemo(() => {
    const typeEntries = [...localParks, ...localRemovedParks, ...linkedTrails, ...linkedAreas].map(
      (park) => park.type,
    );
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
  }, [localParks, localRemovedParks, linkedTrails, linkedAreas, t]);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = parkTabs.indexOf(activeTab);
    const last = parkTabs.length - 1;
    let nextIndex: number;
    switch (event.key) {
      case "ArrowLeft":
        nextIndex = (current + last) % parkTabs.length;
        break;
      case "ArrowRight":
        nextIndex = (current + 1) % parkTabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    setActiveTab(parkTabs[nextIndex]);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  };

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
      showSnackbar({
        message: t(removed ? "hiddenSuccess" : "visibleSuccess"),
        tone: "success",
      });
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : String(error),
        tone: "error",
      });
    } finally {
      setPendingSlug(null);
    }
  };

  const isVisibleTab = activeTab === "visible";
  const isLinkedTab = activeTab === "linked";
  const displayedParks = parksByTab[activeTab];
  const normalizedQuery = query.trim().toLocaleLowerCase("fi-FI");
  const filteredParks = displayedParks.filter((park) => {
    const matchesType = !selectedTypeSlug || park.type.slug === selectedTypeSlug;
    const haystack = [
      park.name,
      park.address,
      getParkTypeDisplayName(park),
      park.type.name,
      ...("mainPark" in park ? [park.mainPark.name] : []),
      ...("linkedAreas" in park ? park.linkedAreas.map((area) => area.name) : []),
    ]
      .join(" ")
      .toLocaleLowerCase("fi-FI");

    return matchesType && haystack.includes(normalizedQuery);
  });
  const groups = isLinkedTab
    ? [
        {
          title: t("linkedTrailsSection"),
          parks: filteredParks.filter((park) => "linkedAreas" in park),
        },
        {
          title: t("linkedAreasSection"),
          parks: filteredParks.filter((park) => "mainPark" in park),
        },
      ]
    : [{ title: null, parks: filteredParks }];
  const resultCountLabel = t("filters.results", { count: filteredParks.length });
  if (
    localParks.length === 0 &&
    localRemovedParks.length === 0 &&
    linkedTrails.length === 0 &&
    linkedAreas.length === 0
  ) {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-border bg-control p-8 text-center backdrop-blur-sm">
        <p className="text-muted-foreground">{t("emptyAll")}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div
        className="inline-flex flex-wrap gap-1 rounded-[1.2rem] border border-border bg-control p-1 shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.4)] backdrop-blur-sm dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]"
        role="tablist"
        aria-label={t("tabs.ariaLabel")}
        onKeyDown={handleTabKeyDown}
      >
        {parkTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`${tabId}-${tab}`}
            aria-controls={`${tabId}-panel`}
            aria-selected={activeTab === tab}
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:px-4 ${
              activeTab === tab
                ? "theme-memory text-foreground shadow-[0_10px_20px_rgba(var(--shadow-rgb),0.16)]"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      <div
        id={`${tabId}-panel`}
        role="tabpanel"
        aria-labelledby={`${tabId}-${activeTab}`}
        className="space-y-4"
      >
        <p className="rounded-[1.3rem] border border-amber-500/25 bg-[linear-gradient(118deg,rgba(245,158,11,0.16),rgba(251,191,36,0.08))] px-4 py-3 text-sm text-amber-950 shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.4)] dark:border-amber-300/18 dark:text-amber-100 dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]">
          {t(tabCopy[activeTab].notice)}
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

        {displayedParks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-control p-8 text-center backdrop-blur-sm">
            <p className="text-muted-foreground">{t(tabCopy[activeTab].empty)}</p>
          </div>
        ) : filteredParks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-control p-8 text-center backdrop-blur-sm">
            <p className="text-muted-foreground">{t("emptyFiltered")}</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.title ?? activeTab} className="space-y-2">
              {group.title !== null && <h3 className="font-semibold">{group.title}</h3>}
              {group.parks.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("emptyLinkedSection")}</p>
              ) : (
                <div className="overflow-x-auto rounded-[1.6rem] border border-border theme-panel shadow-[0_18px_36px_rgba(var(--shadow-rgb),0.14)] backdrop-blur-xl dark:shadow-[0_22px_40px_rgba(var(--shadow-rgb),0.28)]">
                  <table className="min-w-168 w-full text-sm">
                    <thead className="bg-control">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">{t("parkName")}</th>
                        <th className="px-4 py-3 text-left font-medium">{t("parkType")}</th>
                        <th className="px-4 py-3 text-left font-medium">{t("location")}</th>
                        {isLinkedTab ? (
                          <th className="px-4 py-3 text-left font-medium">
                            {t(
                              group.title === t("linkedAreasSection") ? "mainPark" : "linkedAreas",
                            )}
                          </th>
                        ) : (
                          <th className="px-4 py-3 text-right font-medium" />
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/30 dark:divide-white/8">
                      {group.parks.map((park) => {
                        const isUpdating = pendingSlug === park.slug;

                        return (
                          <tr key={park.slug} className="transition-colors hover:bg-accent">
                            <td className="px-4 py-3">
                              <Link
                                href={
                                  isVisibleTab || "mainPark" in park
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
                            {"mainPark" in park ? (
                              <td className="px-4 py-3">
                                <Link
                                  href={appRoutes.controlPanel.parkEdit(park.mainPark.slug)}
                                  className="underline underline-offset-2"
                                >
                                  {park.mainPark.name}
                                </Link>
                              </td>
                            ) : "linkedAreas" in park ? (
                              <td className="px-4 py-3">
                                <ul className="space-y-1">
                                  {park.linkedAreas.map((area) => (
                                    <li key={area.slug}>
                                      <Link
                                        href={appRoutes.controlPanel.parkEdit(area.slug)}
                                        className="underline underline-offset-2"
                                      >
                                        {area.name}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            ) : (
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
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
