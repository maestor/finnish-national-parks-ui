"use client";

import { GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AdminTableFilters } from "@/components/admin/admin-table-filters";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";
import type { VisitWithPark } from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";
import type { Trip } from "@/lib/trips";

interface TripVisitAssignmentsProps {
  trip: Trip;
  visits: VisitWithPark[];
}

interface ActiveAssignedDrag {
  isDragging: boolean;
  itemId: string;
  pointerId: number;
  startX: number;
  startY: number;
}

type VisitUpdateRequest = NonNullable<
  paths["/api/visits/{id}"]["patch"]["requestBody"]
>["content"]["application/json"];

const DRAG_START_DISTANCE = 6;

const compareAvailableVisits = (left: VisitWithPark, right: VisitWithPark) =>
  right.visitedOn.localeCompare(left.visitedOn) ||
  right.createdAt.localeCompare(left.createdAt) ||
  right.id - left.id;

const compareAssignedVisits = (left: VisitWithPark, right: VisitWithPark) => {
  if (
    left.tripStopOrder !== null &&
    right.tripStopOrder !== null &&
    left.tripStopOrder !== right.tripStopOrder
  ) {
    return left.tripStopOrder - right.tripStopOrder;
  }

  if (left.tripStopOrder !== null && right.tripStopOrder === null) {
    return -1;
  }

  if (left.tripStopOrder === null && right.tripStopOrder !== null) {
    return 1;
  }

  return (
    left.visitedOn.localeCompare(right.visitedOn) ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.id - right.id
  );
};

const reorderVisits = <T extends { id: number }>(
  visitsToReorder: T[],
  activeId: string,
  overId: string,
) => {
  const activeIndex = visitsToReorder.findIndex((visit) => String(visit.id) === activeId);
  const overIndex = visitsToReorder.findIndex((visit) => String(visit.id) === overId);

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return visitsToReorder;
  }

  const nextVisits = [...visitsToReorder];
  const [movedVisit] = nextVisits.splice(activeIndex, 1);
  nextVisits.splice(overIndex, 0, movedVisit);
  return nextVisits;
};

const getAssignedVisitsForTrip = (visits: VisitWithPark[], tripId: number) =>
  visits.filter((visit) => visit.trip?.id === tripId).sort(compareAssignedVisits);

const doVisitOrdersMatch = (left: VisitWithPark[], right: VisitWithPark[]) =>
  left.length === right.length && left.every((visit, index) => visit.id === right[index]?.id);

const orderAssignedVisits = (trip: Trip, assignedVisits: VisitWithPark[]) =>
  assignedVisits.map((visit, index) => ({
    ...visit,
    trip: {
      id: trip.id,
      name: trip.name,
    },
    tripStopOrder: index + 1,
  }));

const applyAssignedVisitsToState = (
  trip: Trip,
  currentVisits: VisitWithPark[],
  assignedVisits: VisitWithPark[],
) => {
  const orderedAssignedVisits = orderAssignedVisits(trip, assignedVisits);
  const assignedVisitsById = new Map(orderedAssignedVisits.map((visit) => [visit.id, visit]));

  return currentVisits.map((visit) => assignedVisitsById.get(visit.id) ?? visit);
};

const getAssignedDropTargetId = (clientX: number, clientY: number) =>
  document
    .elementFromPoint(clientX, clientY)
    ?.closest("[data-assigned-visit-id]")
    ?.getAttribute("data-assigned-visit-id") ?? null;

export const TripVisitAssignments = ({ trip, visits }: TripVisitAssignmentsProps) => {
  const t = useTranslations("controlPanel.trips.assignments");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedParkSlug, setSelectedParkSlug] = useState("");
  const [visitsState, setVisitsState] = useState(visits);
  const [pendingVisitId, setPendingVisitId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeAssignedDrag, setActiveAssignedDrag] = useState<ActiveAssignedDrag | null>(null);
  const [dragOverVisitId, setDragOverVisitId] = useState<string | null>(null);
  const visitsStateRef = useRef(visits);
  const activeAssignedDragRef = useRef<ActiveAssignedDrag | null>(null);
  const dragOverVisitIdRef = useRef<string | null>(null);
  const dragStartVisitsStateRef = useRef<VisitWithPark[] | null>(null);
  const dragStartAssignedVisitsRef = useRef<VisitWithPark[] | null>(null);

  useEffect(() => {
    visitsStateRef.current = visitsState;
  }, [visitsState]);

  const parkOptions = useMemo(() => {
    const uniqueParks = Array.from(
      new Map(visitsState.map((visit) => [visit.park.slug, visit.park])).values(),
    ).sort((left, right) => left.name.localeCompare(right.name, "fi-FI"));

    return [
      { label: t("filters.allParks"), value: "" },
      ...uniqueParks.map((park) => ({
        label: park.name,
        value: park.slug,
      })),
    ];
  }, [t, visitsState]);

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

  const assignedVisits = useMemo(
    () => getAssignedVisitsForTrip(visitsState, trip.id),
    [trip.id, visitsState],
  );

  const availableVisits = visitsState
    .filter((visit) => visit.trip === null && matchesBaseFilters(visit))
    .sort(compareAvailableVisits);

  const isBusy = pendingVisitId !== null;

  const saveAssignedVisitOrder = useCallback(
    async ({
      previousAssignedVisits,
      previousVisitsState,
      reorderedAssignedVisits,
    }: {
      previousAssignedVisits: VisitWithPark[];
      previousVisitsState: VisitWithPark[];
      reorderedAssignedVisits: VisitWithPark[];
    }) => {
      const orderedAssignedVisits = orderAssignedVisits(trip, reorderedAssignedVisits);
      const changedVisits = orderedAssignedVisits.filter((visit, index) => {
        const previousVisit = previousAssignedVisits[index];
        return (
          previousVisit?.id !== visit.id || previousVisit.tripStopOrder !== visit.tripStopOrder
        );
      });

      if (changedVisits.length === 0) {
        return;
      }

      setPendingVisitId(changedVisits[0]?.id ?? null);
      setActionError(null);
      setStatusMessage(null);

      try {
        for (const visit of changedVisits) {
          const payload = {
            tripId: trip.id,
            tripStopOrder: visit.tripStopOrder ?? undefined,
          } satisfies VisitUpdateRequest;

          await apiFetch(`/api/visits/${visit.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        }
        await revalidatePublicCache({ parkSlug: changedVisits[0]?.park.slug ?? null });
        setStatusMessage(t("reorderSuccess"));
        router.refresh();
      } catch (error) {
        visitsStateRef.current = previousVisitsState;
        setVisitsState(previousVisitsState);
        setActionError(error instanceof Error ? error.message : String(error));
      } finally {
        setPendingVisitId(null);
      }
    },
    [router, t, trip],
  );

  const previewAssignedVisitMove = useCallback(
    (activeId: string, overId: string) => {
      setActionError(null);
      setStatusMessage(null);
      setVisitsState((currentVisits) => {
        const currentAssignedVisits = getAssignedVisitsForTrip(currentVisits, trip.id);
        const reorderedVisits = reorderVisits(currentAssignedVisits, activeId, overId);
        const nextVisitsState = applyAssignedVisitsToState(trip, currentVisits, reorderedVisits);
        visitsStateRef.current = nextVisitsState;
        return nextVisitsState;
      });
    },
    [trip],
  );

  useEffect(() => {
    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      const currentDrag = activeAssignedDragRef.current;

      if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
        return;
      }

      const distanceX = event.clientX - currentDrag.startX;
      const distanceY = event.clientY - currentDrag.startY;
      const didCrossThreshold =
        Math.hypot(distanceX, distanceY) >= DRAG_START_DISTANCE || currentDrag.isDragging;

      if (!didCrossThreshold) {
        return;
      }

      if (!currentDrag.isDragging) {
        const nextDrag = {
          ...currentDrag,
          isDragging: true,
        } satisfies ActiveAssignedDrag;

        activeAssignedDragRef.current = nextDrag;
        setActiveAssignedDrag(nextDrag);
      }

      const previousTargetId = dragOverVisitIdRef.current;
      const targetId = getAssignedDropTargetId(event.clientX, event.clientY) ?? currentDrag.itemId;
      dragOverVisitIdRef.current = targetId;
      setDragOverVisitId(targetId);

      if (targetId !== currentDrag.itemId && targetId !== previousTargetId) {
        previewAssignedVisitMove(currentDrag.itemId, targetId);
      }
    };

    const clearAssignedDragState = () => {
      activeAssignedDragRef.current = null;
      dragOverVisitIdRef.current = null;
      dragStartAssignedVisitsRef.current = null;
      dragStartVisitsStateRef.current = null;
      setActiveAssignedDrag(null);
      setDragOverVisitId(null);
    };

    const handleWindowPointerUp = (event: globalThis.PointerEvent) => {
      const currentDrag = activeAssignedDragRef.current;

      if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
        return;
      }

      const distanceX = event.clientX - currentDrag.startX;
      const distanceY = event.clientY - currentDrag.startY;
      const didDrag =
        Math.hypot(distanceX, distanceY) >= DRAG_START_DISTANCE || currentDrag.isDragging;
      const previousAssignedVisits = dragStartAssignedVisitsRef.current;
      const previousVisitsState = dragStartVisitsStateRef.current;
      const reorderedAssignedVisits = getAssignedVisitsForTrip(visitsStateRef.current, trip.id);

      clearAssignedDragState();

      if (!didDrag || !previousAssignedVisits || !previousVisitsState) {
        return;
      }

      if (doVisitOrdersMatch(previousAssignedVisits, reorderedAssignedVisits)) {
        return;
      }

      void saveAssignedVisitOrder({
        previousAssignedVisits,
        previousVisitsState,
        reorderedAssignedVisits,
      });
    };

    const handleWindowPointerCancel = (event: globalThis.PointerEvent) => {
      const currentDrag = activeAssignedDragRef.current;

      if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
        return;
      }

      if (dragStartVisitsStateRef.current) {
        visitsStateRef.current = dragStartVisitsStateRef.current;
        setVisitsState(dragStartVisitsStateRef.current);
      }

      clearAssignedDragState();
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerCancel);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
    };
  }, [previewAssignedVisitMove, saveAssignedVisitOrder, trip]);

  const moveAssignedVisitByStep = async (visitId: string, step: number) => {
    if (isBusy) {
      return;
    }

    const previousVisitsState = visitsStateRef.current;
    const previousAssignedVisits = getAssignedVisitsForTrip(previousVisitsState, trip.id);
    const currentIndex = previousAssignedVisits.findIndex((visit) => String(visit.id) === visitId);
    const overVisit = previousAssignedVisits[currentIndex + step];

    if (currentIndex === -1 || !overVisit) {
      return;
    }

    const reorderedVisits = reorderVisits(previousAssignedVisits, visitId, String(overVisit.id));
    const nextVisitsState = applyAssignedVisitsToState(trip, previousVisitsState, reorderedVisits);
    visitsStateRef.current = nextVisitsState;
    setVisitsState(nextVisitsState);

    await saveAssignedVisitOrder({
      previousAssignedVisits,
      previousVisitsState,
      reorderedAssignedVisits: reorderedVisits,
    });
  };

  const handleAssignedDragStart = (visitId: string) => (event: PointerEvent<HTMLButtonElement>) => {
    if (isBusy) {
      return;
    }

    const currentAssignedVisits = getAssignedVisitsForTrip(visitsStateRef.current, trip.id);
    const nextDrag = {
      itemId: visitId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      isDragging: false,
    } satisfies ActiveAssignedDrag;

    dragStartVisitsStateRef.current = visitsStateRef.current;
    dragStartAssignedVisitsRef.current = currentAssignedVisits;
    activeAssignedDragRef.current = nextDrag;
    dragOverVisitIdRef.current = visitId;
    setActiveAssignedDrag(nextDrag);
    setDragOverVisitId(visitId);
    setActionError(null);
    setStatusMessage(null);
  };

  const handleAssignedKeyDown =
    (visitId: string) => async (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        await moveAssignedVisitByStep(visitId, -1);
      }

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        await moveAssignedVisitByStep(visitId, 1);
      }
    };

  const handleTripAssignment = async (visit: VisitWithPark, nextTripId: number | null) => {
    const currentAssignedVisits = getAssignedVisitsForTrip(visitsStateRef.current, trip.id);
    const payload = (
      nextTripId === null
        ? {
            tripId: null,
          }
        : {
            tripId: nextTripId,
            tripStopOrder: currentAssignedVisits.length + 1,
          }
    ) satisfies VisitUpdateRequest;

    const previousVisitsState = visitsStateRef.current;

    let nextVisitsState = previousVisitsState;

    if (nextTripId === null) {
      const remainingAssignedVisits = currentAssignedVisits.filter(
        (currentVisit) => currentVisit.id !== visit.id,
      );
      nextVisitsState = applyAssignedVisitsToState(
        trip,
        previousVisitsState.map((currentVisit) =>
          currentVisit.id === visit.id
            ? {
                ...currentVisit,
                trip: null,
                tripStopOrder: null,
              }
            : currentVisit,
        ),
        remainingAssignedVisits,
      );
    } else {
      const appendedVisit = {
        ...visit,
        trip: {
          id: trip.id,
          name: trip.name,
        },
        tripStopOrder: currentAssignedVisits.length + 1,
      } satisfies VisitWithPark;
      nextVisitsState = applyAssignedVisitsToState(
        trip,
        previousVisitsState.map((currentVisit) =>
          currentVisit.id === visit.id ? appendedVisit : currentVisit,
        ),
        [...currentAssignedVisits, appendedVisit],
      );
    }

    visitsStateRef.current = nextVisitsState;
    setVisitsState(nextVisitsState);

    setPendingVisitId(visit.id);
    setActionError(null);
    setStatusMessage(null);

    try {
      await apiFetch(`/api/visits/${visit.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await revalidatePublicCache({ parkSlug: visit.park.slug });
      router.refresh();
    } catch (error) {
      visitsStateRef.current = previousVisitsState;
      setVisitsState(previousVisitsState);
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingVisitId(null);
    }
  };

  const renderAvailableVisitRow = (
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
          disabled={isBusy}
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

      {statusMessage ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{statusMessage}</p>
      ) : null}
      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-3 rounded-[1.6rem] border border-white/45 bg-white/56 p-4 shadow-[0_18px_36px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/38 dark:shadow-[0_22px_40px_rgba(2,6,23,0.28)]">
          <div>
            <h3 className="text-lg font-semibold">{t("assignedTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("assignedDescription", { count: assignedVisits.length })}
            </p>
            <p id="trip-assigned-visit-reorder-hint" className="mt-2 text-sm text-muted-foreground">
              {t("reorderHint")}
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
                    <th className="w-20 px-4 py-3 text-left font-medium">{t("table.order")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("table.park")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("table.date")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/30 dark:divide-white/8">
                  {assignedVisits.map((visit, index) => {
                    const visitId = String(visit.id);
                    const isDragging =
                      activeAssignedDrag?.isDragging === true &&
                      activeAssignedDrag.itemId === visitId;
                    const isDragTarget =
                      activeAssignedDrag?.isDragging === true &&
                      dragOverVisitId === visitId &&
                      activeAssignedDrag.itemId !== visitId;

                    return (
                      <tr
                        key={visit.id}
                        data-assigned-visit-id={visit.id}
                        className="transition-colors hover:bg-white/56 dark:hover:bg-slate-950/42"
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium tabular-nums text-muted-foreground">
                              {index + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={t("table.reorderVisit", { parkName: visit.park.name })}
                              aria-describedby="trip-assigned-visit-reorder-hint"
                              className="h-8 w-8 cursor-grab rounded-full border border-white/35 bg-white/72 text-foreground/70 hover:bg-white/92 active:cursor-grabbing dark:border-white/10 dark:bg-slate-950/48 dark:text-sky-100/72 dark:hover:bg-slate-950/68"
                              disabled={isBusy}
                              onPointerDown={handleAssignedDragStart(visitId)}
                              onKeyDown={(event) => {
                                void handleAssignedKeyDown(visitId)(event);
                              }}
                            >
                              <GripVertical
                                className={isDragging ? "opacity-100" : "opacity-80"}
                                aria-hidden="true"
                              />
                            </Button>
                          </div>
                        </td>
                        <td
                          className={[
                            "px-4 py-3 transition-colors",
                            isDragging
                              ? "bg-emerald-50/75 dark:bg-emerald-500/10"
                              : isDragTarget
                                ? "bg-sky-50/85 dark:bg-sky-500/10"
                                : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <div className="space-y-1">
                            <p className="font-medium">{visit.park.name}</p>
                            {visit.route ? (
                              <p className="text-sm text-muted-foreground">{visit.route}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="w-[125px] px-4 py-3 align-top whitespace-nowrap">
                          {visit.visitedOn}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleTripAssignment(visit, null)}
                            disabled={isBusy}
                          >
                            {pendingVisitId === visit.id ? "..." : t("removeAction")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
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
                    renderAvailableVisitRow(visit, t("attachAction"), async () =>
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
