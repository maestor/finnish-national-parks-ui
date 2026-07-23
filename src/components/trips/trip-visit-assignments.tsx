"use client";

import { GripVertical, MapPinned, Milestone, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { AdminTableFilters } from "@/components/admin/admin-table-filters";
import { LocationSuggestionInput } from "@/components/location/location-suggestion-input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { formatFinnishDate } from "@/lib/fi-date";
import {
  getUserLocationStatusFromError,
  LOCATION_REQUEST_OPTIONS,
  resolveLocationFromCoordinate,
  type UserLocationStatus,
} from "@/lib/location";
import type { VisitWithPark } from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";
import type {
  TripDetail,
  TripItineraryItem,
  TripItineraryStopItem,
  TripLocation,
  TripStop,
  TripStopCreateRequest,
  TripStopUpdateRequest,
} from "@/lib/trips";

interface TripVisitAssignmentsProps {
  trip: TripDetail;
  visits: VisitWithPark[];
}

type AssignmentLocationMessageKey =
  | "locationLocating"
  | "locationUnsupported"
  | "locationPermissionDenied"
  | "locationTimeout"
  | "locationUnavailable";

interface ActiveItineraryDrag {
  isDragging: boolean;
  itemKey: string;
  pointerId: number;
  startX: number;
  startY: number;
}

const DRAG_START_DISTANCE = 6;

const compareAvailableVisits = (left: VisitWithPark, right: VisitWithPark) =>
  right.visitedOn.localeCompare(left.visitedOn) ||
  right.createdAt.localeCompare(left.createdAt) ||
  right.id - left.id;

const normalizeItinerary = (items: TripItineraryItem[]) =>
  [...items].sort((left, right) => left.tripStopOrder - right.tripStopOrder);

const updateItineraryItemOrder = (
  item: TripItineraryItem,
  tripStopOrder: number,
): TripItineraryItem =>
  item.kind === "visit"
    ? {
        ...item,
        tripStopOrder,
      }
    : {
        ...item,
        tripStopOrder,
        stop: {
          ...item.stop,
          tripStopOrder,
        },
      };

const reindexItinerary = (items: TripItineraryItem[]) =>
  items.map((item, index) => updateItineraryItemOrder(item, index + 1));

const getItineraryItemKey = (item: TripItineraryItem) =>
  item.kind === "visit" ? `visit-${item.visit.id}` : `stop-${item.stop.id}`;

const getItineraryItemLabel = (item: TripItineraryItem) =>
  item.kind === "visit" ? item.visit.park.name : item.stop.location.label;

const reorderItineraryItems = (items: TripItineraryItem[], activeKey: string, overKey: string) => {
  const activeIndex = items.findIndex((item) => getItineraryItemKey(item) === activeKey);
  const overIndex = items.findIndex((item) => getItineraryItemKey(item) === overKey);

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(activeIndex, 1);
  nextItems.splice(overIndex, 0, movedItem);
  return reindexItinerary(nextItems);
};

const doItineraryOrdersMatch = (left: TripItineraryItem[], right: TripItineraryItem[]) =>
  left.length === right.length &&
  left.every((item, index) => {
    const comparedItem = right[index];
    return comparedItem ? getItineraryItemKey(item) === getItineraryItemKey(comparedItem) : false;
  });

const createTripReference = (trip: TripDetail) => ({
  id: trip.id,
  name: trip.name,
  slug: trip.slug,
});

const getItineraryDropTargetKey = (clientX: number, clientY: number) =>
  document
    .elementFromPoint(clientX, clientY)
    ?.closest("[data-itinerary-item-key]")
    ?.getAttribute("data-itinerary-item-key") ?? null;

const getLocationStatusMessage = (
  status: UserLocationStatus,
  t: (key: AssignmentLocationMessageKey) => string,
) => {
  switch (status) {
    case "idle":
      return null;
    case "locating":
      return t("locationLocating");
    case "unsupported":
      return t("locationUnsupported");
    case "permissionDenied":
      return t("locationPermissionDenied");
    case "timeout":
      return t("locationTimeout");
    case "unavailable":
      return t("locationUnavailable");
  }
};

const trimToNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const buildTripDateOptions = (startDate: string, endDate: string) => {
  const options: { label: string; value: string }[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (cursor.getTime() <= end.getTime()) {
    const value = cursor.toISOString().slice(0, 10);
    options.push({
      value,
      label: formatFinnishDate(value),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return options;
};

export const TripVisitAssignments = ({ trip, visits }: TripVisitAssignmentsProps) => {
  const t = useTranslations("controlPanel.trips.assignments");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedParkSlug, setSelectedParkSlug] = useState("");
  const [visitsState, setVisitsState] = useState(visits);
  const [itinerary, setItinerary] = useState(() => normalizeItinerary(trip.itinerary));
  const [editingStopId, setEditingStopId] = useState<number | null>(null);
  const [isStopFormOpen, setIsStopFormOpen] = useState(false);
  const [stopLocationQuery, setStopLocationQuery] = useState("");
  const [stopLocation, setStopLocation] = useState<TripLocation | null>(null);
  const [stopVisitedOn, setStopVisitedOn] = useState("");
  const [stopLocationStatus, setStopLocationStatus] = useState<UserLocationStatus>("idle");
  const [stopNote, setStopNote] = useState("");
  const [stopErrors, setStopErrors] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeItineraryDrag, setActiveItineraryDrag] = useState<ActiveItineraryDrag | null>(null);
  const [dragOverItemKey, setDragOverItemKey] = useState<string | null>(null);
  const itineraryRef = useRef(itinerary);
  const activeItineraryDragRef = useRef<ActiveItineraryDrag | null>(null);
  const dragOverItemKeyRef = useRef<string | null>(null);
  const dragStartItineraryRef = useRef<TripItineraryItem[] | null>(null);

  useEffect(() => {
    setVisitsState(visits);
  }, [visits]);

  useEffect(() => {
    const nextItinerary = normalizeItinerary(trip.itinerary);
    itineraryRef.current = nextItinerary;
    setItinerary(nextItinerary);
  }, [trip.itinerary]);

  useEffect(() => {
    itineraryRef.current = itinerary;
  }, [itinerary]);

  const parkOptions = [
    { label: t("filters.allParks"), value: "" },
    ...Array.from(new Map(visitsState.map((visit) => [visit.park.slug, visit.park])).values())
      .sort((left, right) => left.name.localeCompare(right.name, "fi-FI"))
      .map((park) => ({
        label: park.name,
        value: park.slug,
      })),
  ];

  const normalizedQuery = query.trim().toLocaleLowerCase("fi-FI");

  const availableVisits = visitsState
    .filter((visit) => {
      if (visit.trip !== null) {
        return false;
      }

      const matchesPark = selectedParkSlug ? visit.park.slug === selectedParkSlug : true;
      const haystack = [visit.park.name, visit.route ?? "", visit.visitedOn, visit.author ?? ""]
        .join(" ")
        .toLocaleLowerCase("fi-FI");
      const matchesQuery = normalizedQuery ? haystack.includes(normalizedQuery) : true;

      return matchesPark && matchesQuery;
    })
    .sort(compareAvailableVisits);

  const stopLocationStatusMessage = getLocationStatusMessage(stopLocationStatus, t);
  const isBusy = pendingKey !== null;
  const isEditingStop = editingStopId !== null;
  const isStopFormVisible = isStopFormOpen || isEditingStop;
  const activeEditingStop =
    editingStopId === null
      ? null
      : (itinerary.find(
          (item): item is TripItineraryStopItem =>
            item.kind === "stop" && item.stop.id === editingStopId,
        )?.stop ?? null);
  const tripReference = createTripReference(trip);
  const hasAssignedVisit = itinerary.some((item) => item.kind === "visit");
  const tripDateOptions = trip.dateRange
    ? buildTripDateOptions(trip.dateRange.start, trip.dateRange.end)
    : activeEditingStop
      ? [
          {
            value: activeEditingStop.visitedOn,
            label: formatFinnishDate(activeEditingStop.visitedOn),
          },
        ]
      : [];
  const canOpenStopForm = hasAssignedVisit && tripDateOptions.length > 0;
  const stopAddBlockedMessage = !hasAssignedVisit
    ? t("addStopRequiresVisit")
    : tripDateOptions.length === 0
      ? t("addStopRequiresDateRange")
      : null;

  const setItineraryWithRef = (
    updater: TripItineraryItem[] | ((currentItinerary: TripItineraryItem[]) => TripItineraryItem[]),
  ) => {
    setItinerary((currentItinerary) => {
      const nextItinerary = typeof updater === "function" ? updater(currentItinerary) : updater;
      itineraryRef.current = nextItinerary;
      return nextItinerary;
    });
  };

  const resetStopForm = () => {
    setIsStopFormOpen(false);
    setEditingStopId(null);
    setStopLocationQuery("");
    setStopLocation(null);
    setStopVisitedOn("");
    setStopLocationStatus("idle");
    setStopNote("");
    setStopErrors({});
  };

  const openStopForm = () => {
    setIsStopFormOpen(true);
    setEditingStopId(null);
    setStopLocationQuery("");
    setStopLocation(null);
    setStopVisitedOn("");
    setStopLocationStatus("idle");
    setStopNote("");
    setStopErrors({});
    setActionError(null);
    setStatusMessage(null);
  };

  const handleStopLocationValueChange = (value: string) => {
    if (stopLocationStatus !== "locating") {
      setStopLocationStatus("idle");
    }

    setStopLocationQuery(value);
  };

  const handleLocateStop = () => {
    const geolocation = window.navigator.geolocation;

    if (!geolocation) {
      setStopLocationStatus("unsupported");
      return;
    }

    setActionError(null);
    setStopLocationStatus("locating");

    geolocation.getCurrentPosition(
      async (position) => {
        const resolvedLocation = await resolveLocationFromCoordinate({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });

        setStopLocationQuery(resolvedLocation.label);
        setStopLocation(resolvedLocation);
        setStopLocationStatus("idle");
      },
      (error) => {
        setStopLocationStatus(getUserLocationStatusFromError(error));
      },
      LOCATION_REQUEST_OPTIONS,
    );
  };

  const handleStartStopEdit = (stop: TripStop) => {
    setIsStopFormOpen(true);
    setEditingStopId(stop.id);
    setStopLocationQuery(stop.location.label);
    setStopLocation(stop.location);
    setStopVisitedOn(stop.visitedOn);
    setStopLocationStatus("idle");
    setStopNote(stop.note ?? "");
    setStopErrors({});
    setActionError(null);
    setStatusMessage(null);
  };

  const persistItineraryOrder = useEffectEvent(
    async (previousItinerary: TripItineraryItem[], nextItinerary: TripItineraryItem[]) => {
      const changedItems = nextItinerary.filter((item, index) => {
        const previousItem = previousItinerary[index];
        return (
          previousItem?.tripStopOrder !== item.tripStopOrder ||
          previousItem?.kind !== item.kind ||
          getItineraryItemKey(previousItem) !== getItineraryItemKey(item)
        );
      });

      if (changedItems.length === 0) {
        return;
      }

      setPendingKey("reorder");
      setActionError(null);
      setStatusMessage(null);

      try {
        for (const item of changedItems) {
          if (item.kind === "visit") {
            await apiFetch(`/api/visits/${item.visit.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                tripId: trip.id,
                tripStopOrder: item.tripStopOrder,
              }),
            });
          } else {
            await apiFetch(`/api/trip-stops/${item.stop.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                tripStopOrder: item.tripStopOrder,
              } satisfies TripStopUpdateRequest),
            });
          }
        }

        await revalidatePublicCache();
        setStatusMessage(t("reorderSuccess"));
        router.refresh();
      } catch (error) {
        itineraryRef.current = previousItinerary;
        setItinerary(previousItinerary);
        setActionError(error instanceof Error ? error.message : String(error));
      } finally {
        setPendingKey(null);
      }
    },
  );

  const previewItineraryMove = useEffectEvent((activeKey: string, overKey: string) => {
    setActionError(null);
    setStatusMessage(null);
    setItineraryWithRef((currentItinerary) =>
      reorderItineraryItems(currentItinerary, activeKey, overKey),
    );
  });

  useEffect(() => {
    const clearItineraryDragState = () => {
      activeItineraryDragRef.current = null;
      dragOverItemKeyRef.current = null;
      dragStartItineraryRef.current = null;
      setActiveItineraryDrag(null);
      setDragOverItemKey(null);
    };

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      const currentDrag = activeItineraryDragRef.current;

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
        } satisfies ActiveItineraryDrag;

        activeItineraryDragRef.current = nextDrag;
        setActiveItineraryDrag(nextDrag);
      }

      const previousTargetKey = dragOverItemKeyRef.current;
      const targetKey =
        getItineraryDropTargetKey(event.clientX, event.clientY) ?? currentDrag.itemKey;

      dragOverItemKeyRef.current = targetKey;
      setDragOverItemKey(targetKey);

      if (targetKey !== currentDrag.itemKey && targetKey !== previousTargetKey) {
        previewItineraryMove(currentDrag.itemKey, targetKey);
      }
    };

    const handleWindowPointerUp = (event: globalThis.PointerEvent) => {
      const currentDrag = activeItineraryDragRef.current;

      if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
        return;
      }

      const distanceX = event.clientX - currentDrag.startX;
      const distanceY = event.clientY - currentDrag.startY;
      const didDrag =
        Math.hypot(distanceX, distanceY) >= DRAG_START_DISTANCE || currentDrag.isDragging;
      const previousItinerary = dragStartItineraryRef.current;
      const nextItinerary = itineraryRef.current;

      clearItineraryDragState();

      if (!didDrag || !previousItinerary) {
        return;
      }

      if (doItineraryOrdersMatch(previousItinerary, nextItinerary)) {
        return;
      }

      void persistItineraryOrder(previousItinerary, nextItinerary);
    };

    const handleWindowPointerCancel = (event: globalThis.PointerEvent) => {
      const currentDrag = activeItineraryDragRef.current;

      if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
        return;
      }

      const previousItinerary = dragStartItineraryRef.current;

      if (previousItinerary) {
        itineraryRef.current = previousItinerary;
        setItinerary(previousItinerary);
      }

      clearItineraryDragState();
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerCancel);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
    };
  }, []);

  const moveItineraryItemByStep = async (itemKey: string, step: number) => {
    if (isBusy) {
      return;
    }

    const previousItinerary = itineraryRef.current;
    const currentIndex = previousItinerary.findIndex(
      (item) => getItineraryItemKey(item) === itemKey,
    );
    const overItem = previousItinerary[currentIndex + step];

    if (currentIndex === -1 || !overItem) {
      return;
    }

    const nextItinerary = reorderItineraryItems(
      previousItinerary,
      itemKey,
      getItineraryItemKey(overItem),
    );

    setItineraryWithRef(nextItinerary);
    await persistItineraryOrder(previousItinerary, nextItinerary);
  };

  const handleItineraryDragStart =
    (itemKey: string) => (event: PointerEvent<HTMLButtonElement>) => {
      if (isBusy) {
        return;
      }

      const nextDrag = {
        itemKey,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        isDragging: false,
      } satisfies ActiveItineraryDrag;

      dragStartItineraryRef.current = itineraryRef.current;
      activeItineraryDragRef.current = nextDrag;
      dragOverItemKeyRef.current = itemKey;
      setActiveItineraryDrag(nextDrag);
      setDragOverItemKey(itemKey);
      setActionError(null);
      setStatusMessage(null);
    };

  const handleItineraryKeyDown =
    (itemKey: string) => async (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        await moveItineraryItemByStep(itemKey, -1);
      }

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        await moveItineraryItemByStep(itemKey, 1);
      }
    };

  const handleAttachVisit = async (visit: VisitWithPark) => {
    const previousItinerary = itineraryRef.current;
    const previousVisitsState = visitsState;
    const nextOrder = previousItinerary.length + 1;
    const nextVisit = {
      ...visit,
      trip: tripReference,
      tripStopOrder: nextOrder,
    } satisfies VisitWithPark;
    const nextItinerary = [
      ...previousItinerary,
      {
        kind: "visit",
        tripStopOrder: nextOrder,
        visit: {
          author: visit.author,
          createdAt: visit.createdAt,
          id: visit.id,
          note: visit.note,
          park: visit.park,
          route: visit.route,
          updatedAt: visit.updatedAt,
          visitedOn: visit.visitedOn,
        },
      },
    ] satisfies TripItineraryItem[];

    setPendingKey(`visit-${visit.id}-attach`);
    setActionError(null);
    setStatusMessage(null);
    setItineraryWithRef(nextItinerary);
    setVisitsState((currentVisits) =>
      currentVisits.map((currentVisit) =>
        currentVisit.id === visit.id ? nextVisit : currentVisit,
      ),
    );

    try {
      await apiFetch(`/api/visits/${visit.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          tripId: trip.id,
          tripStopOrder: nextOrder,
        }),
      });
      await revalidatePublicCache({ parkSlug: visit.park.slug });
      setStatusMessage(t("attachSuccess"));
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      setVisitsState(previousVisitsState);
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingKey(null);
    }
  };

  const handleRemoveVisit = async (visitId: number) => {
    const previousItinerary = itineraryRef.current;
    const previousVisitsState = visitsState;
    const visit = visitsState.find((currentVisit) => currentVisit.id === visitId);

    if (!visit) {
      return;
    }

    setPendingKey(`visit-${visitId}-remove`);
    setActionError(null);
    setStatusMessage(null);
    setItineraryWithRef(
      reindexItinerary(
        previousItinerary.filter((item) => !(item.kind === "visit" && item.visit.id === visitId)),
      ),
    );
    setVisitsState((currentVisits) =>
      currentVisits.map((currentVisit) =>
        currentVisit.id === visitId
          ? {
              ...currentVisit,
              trip: null,
              tripStopOrder: null,
            }
          : currentVisit,
      ),
    );

    try {
      await apiFetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        body: JSON.stringify({
          tripId: null,
        }),
      });
      await revalidatePublicCache({ parkSlug: visit.park.slug });
      setStatusMessage(t("detachSuccess"));
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      setVisitsState(previousVisitsState);
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingKey(null);
    }
  };

  const handleSubmitStop = async () => {
    const normalizedStopLocationQuery = stopLocationQuery.trim();
    const nextErrors: Record<string, string> = {};

    if (!stopVisitedOn) {
      nextErrors.visitedOn = t("validation.stopVisitedOnRequired");
    }

    if (!normalizedStopLocationQuery) {
      nextErrors.location = t("validation.stopLocationRequired");
    } else if (stopLocation === null) {
      nextErrors.location = t("validation.stopLocationSelectionRequired");
    }

    if (Object.keys(nextErrors).length > 0) {
      setStopErrors(nextErrors);
      return;
    }

    const note = trimToNull(stopNote);

    setStopErrors({});
    setActionError(null);
    setStatusMessage(null);

    if (editingStopId !== null) {
      const selectedStopLocation = stopLocation;

      if (selectedStopLocation === null) {
        return;
      }

      const previousItinerary = itineraryRef.current;
      const nextItinerary = previousItinerary.map((item) =>
        item.kind === "stop" && item.stop.id === editingStopId
          ? {
              ...item,
              stop: {
                ...item.stop,
                location: selectedStopLocation,
                note,
              },
            }
          : item,
      );

      setPendingKey(`stop-${editingStopId}-update`);
      setItineraryWithRef(nextItinerary);

      try {
        const updatedStop = await apiFetch<TripStop>(`/api/trip-stops/${editingStopId}`, {
          method: "PATCH",
          body: JSON.stringify({
            location: selectedStopLocation,
            note,
            visitedOn: stopVisitedOn,
          } satisfies TripStopUpdateRequest),
        });

        setItineraryWithRef((currentItinerary) =>
          currentItinerary.map((item) =>
            item.kind === "stop" && item.stop.id === editingStopId
              ? {
                  ...item,
                  stop: updatedStop,
                  tripStopOrder: updatedStop.tripStopOrder,
                }
              : item,
          ),
        );
        await revalidatePublicCache();
        setStatusMessage(t("stopUpdateSuccess"));
        resetStopForm();
        router.refresh();
      } catch (error) {
        itineraryRef.current = previousItinerary;
        setItinerary(previousItinerary);
        setActionError(error instanceof Error ? error.message : String(error));
      } finally {
        setPendingKey(null);
      }

      return;
    }

    const previousItinerary = itineraryRef.current;
    const selectedStopLocation = stopLocation;

    if (selectedStopLocation === null) {
      return;
    }

    setPendingKey("stop-create");

    try {
      const createdStop = await apiFetch<TripStop>(`/api/trips/${trip.id}/stops`, {
        method: "POST",
        body: JSON.stringify({
          location: selectedStopLocation,
          note,
          tripStopOrder: previousItinerary.length + 1,
          visitedOn: stopVisitedOn,
        } satisfies TripStopCreateRequest),
      });

      setItineraryWithRef((currentItinerary) =>
        normalizeItinerary([
          ...currentItinerary,
          {
            kind: "stop",
            stop: createdStop,
            tripStopOrder: createdStop.tripStopOrder,
          } satisfies TripItineraryStopItem,
        ]),
      );
      await revalidatePublicCache();
      setStatusMessage(t("stopCreateSuccess"));
      resetStopForm();
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingKey(null);
    }
  };

  const handleDeleteStop = async (stop: TripStop) => {
    if (!window.confirm(t("deleteStopConfirm", { locationLabel: stop.location.label }))) {
      return;
    }

    const previousItinerary = itineraryRef.current;
    setPendingKey(`stop-${stop.id}-delete`);
    setActionError(null);
    setStatusMessage(null);
    setItineraryWithRef(
      reindexItinerary(
        previousItinerary.filter((item) => !(item.kind === "stop" && item.stop.id === stop.id)),
      ),
    );

    try {
      await apiFetch(`/api/trip-stops/${stop.id}`, {
        method: "DELETE",
      });
      await revalidatePublicCache();
      setStatusMessage(t("stopDeleteSuccess"));
      if (editingStopId === stop.id) {
        resetStopForm();
      }
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingKey(null);
    }
  };

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
          itinerary: itinerary.length,
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="min-w-0 space-y-4 rounded-[1.6rem] border border-white/45 bg-white/56 p-4 shadow-[0_18px_36px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/38 dark:shadow-[0_22px_40px_rgba(2,6,23,0.28)]">
          <div className="rounded-[1.3rem] border border-dashed border-white/45 bg-white/40 p-4 dark:border-white/10 dark:bg-slate-950/28">
            <div className="flex items-start gap-3">
              <MapPinned className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-medium">{t("startingPointTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("startingPointDescription")}</p>
                <p className="text-sm font-medium">
                  {trip.startingPoint?.label ?? t("startingPointEmpty")}
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{t("assignedTitle")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("assignedDescription", { count: itinerary.length })}
                </p>
              </div>
              {!isStopFormVisible && !isEditingStop ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-controls="trip-stop-editor"
                  aria-expanded="false"
                  disabled={isBusy || !canOpenStopForm}
                  onClick={openStopForm}
                >
                  {t("addStopAction")}
                </Button>
              ) : null}
            </div>
            <p id="trip-itinerary-reorder-hint" className="mt-2 text-sm text-muted-foreground">
              {t("reorderHint")}
            </p>
            {!isStopFormVisible && stopAddBlockedMessage ? (
              <p className="mt-2 text-sm text-muted-foreground">{stopAddBlockedMessage}</p>
            ) : null}
          </div>

          {isStopFormVisible ? (
            <section
              id="trip-stop-editor"
              className="space-y-4 rounded-[1.3rem] border border-white/35 bg-white/40 p-4 dark:border-white/8 dark:bg-slate-950/28"
            >
              <div className="flex items-start gap-3">
                <Milestone className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <h4 className="text-lg font-semibold">
                    {isEditingStop ? t("editStopTitle") : t("addStopTitle")}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isEditingStop ? t("editStopDescription") : t("addStopDescription")}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="trip-stop-visited-on" className="text-sm font-medium">
                  {t("stopVisitedOnLabel")}
                </label>
                <select
                  id="trip-stop-visited-on"
                  value={stopVisitedOn}
                  onChange={(event) => setStopVisitedOn(event.target.value)}
                  className="flex h-10 w-full rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm ring-offset-background shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                  <option value="">{t("stopVisitedOnPlaceholder")}</option>
                  {tripDateOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {stopErrors.visitedOn ? (
                  <p className="text-sm text-destructive">{stopErrors.visitedOn}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <LocationSuggestionInput
                  assistiveMessage={stopLocationStatusMessage ?? undefined}
                  assistiveMessageTone={
                    stopLocationStatus !== "idle" && stopLocationStatus !== "locating"
                      ? "error"
                      : "default"
                  }
                  id="trip-stop-location"
                  inputClassName="h-10"
                  isLocating={stopLocationStatus === "locating"}
                  label={t("stopLocationLabel")}
                  locateButtonLabel={t("useCurrentLocation")}
                  name="stopLocation"
                  onLocate={handleLocateStop}
                  onSelectedLocationChange={setStopLocation}
                  onValueChange={handleStopLocationValueChange}
                  placeholder={t("stopLocationPlaceholder")}
                  required={false}
                  selectedLocation={stopLocation}
                  value={stopLocationQuery}
                />
                {stopErrors.location ? (
                  <p className="text-sm text-destructive">{stopErrors.location}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="trip-stop-note" className="text-sm font-medium">
                  {t("stopNoteLabel")}
                </label>
                <textarea
                  id="trip-stop-note"
                  rows={4}
                  value={stopNote}
                  onChange={(event) => setStopNote(event.target.value)}
                  placeholder={t("stopNotePlaceholder")}
                  className="flex w-full resize-y rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm ring-offset-background shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" disabled={isBusy} onClick={() => void handleSubmitStop()}>
                  {pendingKey === "stop-create" || pendingKey?.startsWith("stop-") ? "..." : null}
                  {pendingKey === "stop-create" || pendingKey?.startsWith("stop-")
                    ? null
                    : isEditingStop
                      ? t("saveStopChanges")
                      : t("addStopAction")}
                </Button>
                <button
                  type="button"
                  onClick={resetStopForm}
                  className="text-sm text-muted-foreground underline hover:text-foreground"
                >
                  {isEditingStop ? t("cancelStopEdit") : t("cancelStopAdd")}
                </button>
              </div>
            </section>
          ) : null}

          {itinerary.length === 0 ? (
            <div className="rounded-[1.3rem] border border-dashed border-white/45 bg-white/40 p-6 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-950/28">
              {t("assignedEmpty")}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.3rem] border border-white/35 dark:border-white/8">
              <table className="w-full text-sm">
                <thead className="bg-white/70 dark:bg-slate-950/52">
                  <tr>
                    <th className="w-32 px-4 py-3 text-left font-medium">{t("table.order")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("table.target")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("table.details")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/30 dark:divide-white/8">
                  {itinerary.map((item) => {
                    const itemKey = getItineraryItemKey(item);
                    const isPending = pendingKey?.includes(itemKey) ?? false;
                    const isVisit = item.kind === "visit";
                    const itemLabel = getItineraryItemLabel(item);
                    const isDragging =
                      activeItineraryDrag?.isDragging === true &&
                      activeItineraryDrag.itemKey === itemKey;
                    const isDragTarget =
                      activeItineraryDrag?.isDragging === true &&
                      dragOverItemKey === itemKey &&
                      activeItineraryDrag.itemKey !== itemKey;

                    return (
                      <tr
                        key={itemKey}
                        data-itinerary-item-key={itemKey}
                        className="transition-colors hover:bg-white/56 dark:hover:bg-slate-950/42"
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-2">
                            <span className="w-7 text-sm font-medium tabular-nums text-muted-foreground">
                              {item.tripStopOrder}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={t("table.reorderItem", { targetName: itemLabel })}
                              aria-describedby="trip-itinerary-reorder-hint"
                              className="h-8 w-8 cursor-grab rounded-full border border-white/35 bg-white/72 text-foreground/70 hover:bg-white/92 active:cursor-grabbing dark:border-white/10 dark:bg-slate-950/48 dark:text-sky-100/72 dark:hover:bg-slate-950/68"
                              disabled={isBusy}
                              onPointerDown={handleItineraryDragStart(itemKey)}
                              onKeyDown={(event) => {
                                void handleItineraryKeyDown(itemKey)(event);
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
                            "px-4 py-3 align-top transition-colors",
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
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-900 dark:bg-sky-950/60 dark:text-sky-200">
                                {isVisit ? t("visitBadge") : t("stopBadge")}
                              </span>
                              <p className="font-medium">{itemLabel}</p>
                            </div>
                            {isVisit ? (
                              item.visit.route ? (
                                <p className="text-sm text-muted-foreground">{item.visit.route}</p>
                              ) : null
                            ) : item.stop.note ? (
                              <p className="text-sm text-muted-foreground">{item.stop.note}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-muted-foreground">
                          {isVisit ? item.visit.visitedOn : item.stop.visitedOn}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {isVisit ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isBusy}
                                onClick={() => void handleRemoveVisit(item.visit.id)}
                              >
                                {isPending ? "..." : t("removeVisitAction")}
                              </Button>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isBusy}
                                  onClick={() => handleStartStopEdit(item.stop)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                                  {t("editStopAction")}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isBusy}
                                  onClick={() => void handleDeleteStop(item.stop)}
                                >
                                  {isPending ? "..." : t("deleteStopAction")}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="min-w-0">
          <section className="space-y-3 rounded-[1.6rem] border border-white/45 bg-white/56 p-4 shadow-[0_18px_36px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/38 dark:shadow-[0_22px_40px_rgba(2,6,23,0.28)]">
            <div className="flex items-start gap-3">
              <Plus className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold">{t("availableTitle")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("availableDescription", { count: availableVisits.length })}
                </p>
              </div>
            </div>

            {availableVisits.length === 0 ? (
              <div className="rounded-[1.3rem] border border-dashed border-white/45 bg-white/40 p-6 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-950/28">
                {t("availableEmpty")}
              </div>
            ) : (
              <div
                data-testid="available-visits-scroll-area"
                className="max-h-[36rem] overflow-y-auto rounded-[1.3rem] border border-white/35 dark:border-white/8"
              >
                <table className="w-full table-fixed text-sm">
                  <thead className="sticky top-0 z-10 bg-white/70 dark:bg-slate-950/52">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">{t("table.target")}</th>
                      <th className="w-28 px-4 py-3 text-left font-medium">{t("table.details")}</th>
                      <th className="w-28 px-4 py-3 text-right font-medium">
                        {t("table.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/30 dark:divide-white/8">
                    {availableVisits.map((visit) => (
                      <tr
                        key={visit.id}
                        className="transition-colors hover:bg-white/56 dark:hover:bg-slate-950/42"
                      >
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p className="font-medium">{visit.park.name}</p>
                            {visit.route ? (
                              <p className="text-sm text-muted-foreground">{visit.route}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="w-28 px-4 py-3 align-top whitespace-nowrap text-muted-foreground">
                          {visit.visitedOn}
                        </td>
                        <td className="w-28 px-4 py-3 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="whitespace-nowrap"
                            disabled={isBusy}
                            onClick={() => void handleAttachVisit(visit)}
                          >
                            {pendingKey === `visit-${visit.id}-attach` ? "..." : t("attachAction")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
};
