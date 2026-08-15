"use client";

import { GripVertical, MapPinned, Milestone, Pencil, Plus, X } from "lucide-react";
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
import { createPortal } from "react-dom";
import { AdminTableFilters } from "@/components/admin/admin-table-filters";
import { LocationSuggestionInput } from "@/components/location/location-suggestion-input";
import { Button } from "@/components/ui/button";
import {
  LONG_TEXTAREA_MAX_LENGTH,
  TextareaWithCounter,
} from "@/components/ui/textarea-with-counter";
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
import {
  getTripStopDisplayName,
  type TripDetail,
  type TripItineraryItem,
  type TripItineraryStopItem,
  type TripItineraryVisitItem,
  type TripLocation,
  type TripStop,
  type TripStopCreateRequest,
  type TripStopUpdateRequest,
} from "@/lib/trips";
import { TripStopImageSection } from "./trip-stop-image-section";

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

interface ItineraryDragLayoutItem {
  bottom: number;
  centerY: number;
  itemKey: string;
  left: number;
  right: number;
  top: number;
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

const updateItineraryVisitExcludeFromRoute = (
  item: TripItineraryVisitItem,
  excludeFromRoute: boolean,
): TripItineraryVisitItem => ({
  ...item,
  visit: {
    ...item.visit,
    excludeFromRoute,
  },
});

const reindexItinerary = (items: TripItineraryItem[]) =>
  items.map((item, index) => updateItineraryItemOrder(item, index + 1));

const getItineraryItemKey = (item: TripItineraryItem) =>
  item.kind === "visit" ? `visit-${item.visit.id}` : `stop-${item.stop.id}`;

const getItineraryOrderKeys = (items: TripItineraryItem[]) => items.map(getItineraryItemKey);

const getItineraryItemLabel = (item: TripItineraryItem) =>
  item.kind === "visit" ? item.visit.park.name : getTripStopDisplayName(item.stop);

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

const doItineraryOrdersMatch = (left: string[], right: string[]) =>
  left.length === right.length && left.every((itemKey, index) => itemKey === right[index]);

const restoreItineraryOrder = (items: TripItineraryItem[], savedOrder: string[]) => {
  const itemByKey = new Map(items.map((item) => [getItineraryItemKey(item), item]));

  return savedOrder.flatMap((itemKey) => {
    const item = itemByKey.get(itemKey);
    return item ? [item] : [];
  });
};

const createTripReference = (trip: TripDetail) => ({
  id: trip.id,
  name: trip.name,
  slug: trip.slug,
});

const captureItineraryDragLayout = (container: ParentNode) =>
  Array.from(container.querySelectorAll<HTMLElement>("[data-itinerary-item-key]")).flatMap(
    (itemElement) => {
      const itemKey = itemElement.getAttribute("data-itinerary-item-key");

      if (!itemKey) {
        return [];
      }

      const { bottom, height, left, right, top } = itemElement.getBoundingClientRect();

      return [
        {
          itemKey,
          top,
          bottom,
          centerY: top + height / 2,
          left,
          right,
        } satisfies ItineraryDragLayoutItem,
      ];
    },
  );

const getItineraryDropTargetKey = (
  dragLayout: ItineraryDragLayoutItem[],
  clientX: number,
  clientY: number,
  activeKey: string,
) => {
  if (dragLayout.length === 0) {
    return activeKey;
  }

  const hoveredItem = dragLayout.find(
    (item) =>
      clientX >= item.left &&
      clientX <= item.right &&
      clientY >= item.top &&
      clientY <= item.bottom,
  );

  if (hoveredItem) {
    return hoveredItem.itemKey;
  }

  const listLeft = Math.min(...dragLayout.map((item) => item.left));
  const listRight = Math.max(...dragLayout.map((item) => item.right));

  if (clientX < listLeft || clientX > listRight) {
    return activeKey;
  }

  for (const item of dragLayout) {
    if (clientY <= item.centerY) {
      return item.itemKey;
    }
  }

  return dragLayout.at(-1)?.itemKey ?? activeKey;
};

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

const doTripLocationsMatch = (left: TripLocation | null, right: TripLocation | null) => {
  if (left === right) {
    return true;
  }

  if (left === null || right === null) {
    return left === right;
  }

  return (
    left.label === right.label &&
    left.displayName === right.displayName &&
    left.coordinate.lat === right.coordinate.lat &&
    left.coordinate.lon === right.coordinate.lon
  );
};

const createPreviewText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
};

const buildTripDateOptions = (startDate: string, endDate: string) => {
  const options: { label: string; value: string }[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  cursor.setUTCDate(cursor.getUTCDate() - 1);
  end.setUTCDate(end.getUTCDate() + 1);

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

const insertStopIntoItinerary = (
  items: TripItineraryItem[],
  stop: TripStop,
  tripStopOrder: number,
) => {
  const nextItems = [...items];

  nextItems.splice(Math.max(tripStopOrder - 1, 0), 0, {
    kind: "stop",
    stop: {
      ...stop,
      tripStopOrder,
    },
    tripStopOrder,
  } satisfies TripItineraryStopItem);

  return reindexItinerary(nextItems);
};

export const TripVisitAssignments = ({ trip, visits }: TripVisitAssignmentsProps) => {
  const t = useTranslations("controlPanel.trips.assignments");
  const router = useRouter();
  const tripIdRef = useRef(trip.id);
  const [query, setQuery] = useState("");
  const [selectedParkSlug, setSelectedParkSlug] = useState("");
  const [visitsState, setVisitsState] = useState(visits);
  const [itinerary, setItinerary] = useState(() => normalizeItinerary(trip.itinerary));
  const [savedItineraryOrder, setSavedItineraryOrder] = useState(() =>
    getItineraryOrderKeys(normalizeItinerary(trip.itinerary)),
  );
  const [editingStopId, setEditingStopId] = useState<number | null>(null);
  const [isStopFormOpen, setIsStopFormOpen] = useState(false);
  const [stopLocationQuery, setStopLocationQuery] = useState("");
  const [stopLocation, setStopLocation] = useState<TripLocation | null>(null);
  const [stopDisplayName, setStopDisplayName] = useState("");
  const [stopOrder, setStopOrder] = useState("");
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
  const savedItineraryOrderRef = useRef(savedItineraryOrder);
  const pendingKeyRef = useRef<string | null>(null);
  const activeItineraryDragRef = useRef<ActiveItineraryDrag | null>(null);
  const dragOverItemKeyRef = useRef<string | null>(null);
  const itineraryDragLayoutRef = useRef<ItineraryDragLayoutItem[] | null>(null);
  const dragStartItineraryRef = useRef<TripItineraryItem[] | null>(null);
  const stopDialogCloseButtonRef = useRef<HTMLButtonElement>(null);
  const previousStopDialogFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setVisitsState(visits);
  }, [visits]);

  useEffect(() => {
    const nextItinerary = normalizeItinerary(trip.itinerary);
    const nextSavedOrder = getItineraryOrderKeys(nextItinerary);
    const currentItineraryOrder = getItineraryOrderKeys(itineraryRef.current);
    const currentSavedOrder = savedItineraryOrderRef.current;
    const hasUnsavedLocalOrder = !doItineraryOrdersMatch(currentSavedOrder, currentItineraryOrder);
    const isSameTrip = tripIdRef.current === trip.id;

    tripIdRef.current = trip.id;

    if (
      isSameTrip &&
      hasUnsavedLocalOrder &&
      doItineraryOrdersMatch(nextSavedOrder, currentSavedOrder)
    ) {
      return;
    }

    itineraryRef.current = nextItinerary;
    savedItineraryOrderRef.current = nextSavedOrder;
    setItinerary(nextItinerary);
    setSavedItineraryOrder(nextSavedOrder);
  }, [trip.id, trip.itinerary]);

  useEffect(() => {
    itineraryRef.current = itinerary;
  }, [itinerary]);

  useEffect(() => {
    savedItineraryOrderRef.current = savedItineraryOrder;
  }, [savedItineraryOrder]);

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
  const currentItineraryOrder = getItineraryOrderKeys(itinerary);
  const hasUnsavedItineraryOrder = !doItineraryOrdersMatch(
    savedItineraryOrder,
    currentItineraryOrder,
  );
  const isBusy = pendingKey !== null;
  const isActionLocked = isBusy || hasUnsavedItineraryOrder;
  const isEditingStop = editingStopId !== null;
  const isStopFormVisible = Boolean(isStopFormOpen || isEditingStop);
  const isReorderDisabled = isBusy || isStopFormVisible;
  const isSaveOrderDisabled = isBusy || activeItineraryDrag?.isDragging === true;
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
  const stopOrderOptions = itinerary.map((item, index) => {
    const order = index + 1;

    if (index === 0) {
      return {
        label: `${order} - ${t("stopOrderFirst")}`,
        value: String(order),
      };
    }

    const previousItem = itinerary[index - 1] ?? item;
    const previousKindLabel = previousItem.kind === "visit" ? t("visitBadge") : t("stopBadge");

    return {
      label: `${order} - ${t("stopOrderAfter", {
        targetKind: previousKindLabel.toLocaleLowerCase("fi-FI"),
        targetName: getItineraryItemLabel(previousItem),
      })}`,
      value: String(order),
    };
  });
  stopOrderOptions.push({
    label: `${itinerary.length + 1} - ${t("stopOrderLast")}`,
    value: String(itinerary.length + 1),
  });
  const canOpenStopForm = hasAssignedVisit && tripDateOptions.length > 0;
  const stopAddBlockedMessage = !hasAssignedVisit
    ? t("addStopRequiresVisit")
    : tripDateOptions.length === 0
      ? t("addStopRequiresDateRange")
      : null;
  const normalizedStopLocationQuery = stopLocationQuery.trim();
  const normalizedStopDisplayName = trimToNull(stopDisplayName);
  const normalizedStopNote = trimToNull(stopNote);
  const hasStopDetailChanges =
    isEditingStop &&
    activeEditingStop !== null &&
    (stopVisitedOn !== activeEditingStop.visitedOn ||
      normalizedStopDisplayName !== activeEditingStop.displayName ||
      normalizedStopNote !== (activeEditingStop.note ?? null) ||
      normalizedStopLocationQuery !== activeEditingStop.location.label ||
      !doTripLocationsMatch(stopLocation, activeEditingStop.location));
  const isStopNoteTooLong = stopNote.length > LONG_TEXTAREA_MAX_LENGTH;
  const isStopSubmitBlockedByLength = isStopNoteTooLong && (!isEditingStop || hasStopDetailChanges);

  const setItineraryWithRef = (
    updater: TripItineraryItem[] | ((currentItinerary: TripItineraryItem[]) => TripItineraryItem[]),
  ) => {
    setItinerary((currentItinerary) => {
      const nextItinerary = typeof updater === "function" ? updater(currentItinerary) : updater;
      itineraryRef.current = nextItinerary;
      return nextItinerary;
    });
  };

  const setPendingAction = (nextPendingKey: string | null) => {
    pendingKeyRef.current = nextPendingKey;
    setPendingKey(nextPendingKey);
  };

  const updateStopImages = (stopId: number, images: TripStop["images"]) => {
    setItineraryWithRef((currentItinerary) =>
      currentItinerary.map((item) =>
        item.kind === "stop" && item.stop.id === stopId
          ? {
              ...item,
              stop: {
                ...item.stop,
                images,
              },
            }
          : item,
      ),
    );
  };

  const clearStopForm = () => {
    setIsStopFormOpen(false);
    setEditingStopId(null);
    setStopLocationQuery("");
    setStopLocation(null);
    setStopDisplayName("");
    setStopOrder("");
    setStopVisitedOn("");
    setStopLocationStatus("idle");
    setStopNote("");
    setStopErrors({});
  };

  const handleCloseStopForm = () => {
    if (pendingKeyRef.current !== null) {
      return;
    }

    clearStopForm();
  };

  const openStopForm = () => {
    if (pendingKeyRef.current !== null || hasUnsavedItineraryOrder) {
      return;
    }

    previousStopDialogFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsStopFormOpen(true);
    setEditingStopId(null);
    setStopLocationQuery("");
    setStopLocation(null);
    setStopDisplayName("");
    setStopOrder(String(itineraryRef.current.length + 1));
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
    if (pendingKeyRef.current !== null || hasUnsavedItineraryOrder) {
      return;
    }

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
    if (pendingKeyRef.current !== null || hasUnsavedItineraryOrder) {
      return;
    }

    previousStopDialogFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsStopFormOpen(true);
    setEditingStopId(stop.id);
    setStopLocationQuery(stop.location.label);
    setStopLocation(stop.location);
    setStopDisplayName(stop.displayName ?? "");
    setStopOrder(String(stop.tripStopOrder));
    setStopVisitedOn(stop.visitedOn);
    setStopLocationStatus("idle");
    setStopNote(stop.note ?? "");
    setStopErrors({});
    setActionError(null);
    setStatusMessage(null);
  };

  const handleStopFormEscape = useEffectEvent(() => {
    if (pendingKeyRef.current !== null) {
      return;
    }

    clearStopForm();
  });

  useEffect(() => {
    if (!isStopFormVisible) {
      previousStopDialogFocusRef.current?.focus();
      previousStopDialogFocusRef.current = null;
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    stopDialogCloseButtonRef.current?.focus();

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        handleStopFormEscape();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isStopFormVisible]);

  const persistItineraryOrder = useEffectEvent(async (nextItinerary: TripItineraryItem[]) => {
    if (pendingKeyRef.current !== null || !hasUnsavedItineraryOrder) {
      return;
    }

    const changedItems = nextItinerary.filter((item, index) => {
      return savedItineraryOrder[index] !== getItineraryItemKey(item);
    });

    if (changedItems.length === 0) {
      return;
    }

    setPendingAction("reorder-save");
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

      await revalidatePublicCache({ tripSlug: trip.slug });
      setSavedItineraryOrder(getItineraryOrderKeys(nextItinerary));
      setStatusMessage(t("reorderSuccess"));
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("reorderFailed"));
    } finally {
      setPendingAction(null);
    }
  });

  const handleRestoreItineraryOrder = () => {
    if (pendingKeyRef.current !== null || activeItineraryDrag?.isDragging === true) {
      return;
    }

    setActionError(null);
    setStatusMessage(null);
    setItineraryWithRef((currentItinerary) =>
      restoreItineraryOrder(currentItinerary, savedItineraryOrder),
    );
  };

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
      itineraryDragLayoutRef.current = null;
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
      const targetKey = getItineraryDropTargetKey(
        itineraryDragLayoutRef.current ?? [],
        event.clientX,
        event.clientY,
        currentDrag.itemKey,
      );

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

      if (
        doItineraryOrdersMatch(
          getItineraryOrderKeys(previousItinerary),
          getItineraryOrderKeys(nextItinerary),
        )
      ) {
        return;
      }
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
    if (pendingKeyRef.current !== null || isStopFormVisible) {
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
  };

  const handleItineraryDragStart =
    (itemKey: string) => (event: PointerEvent<HTMLButtonElement>) => {
      if (pendingKeyRef.current !== null || isStopFormVisible) {
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
      itineraryDragLayoutRef.current = captureItineraryDragLayout(
        event.currentTarget.closest("table") ?? document,
      );
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
    if (pendingKeyRef.current !== null || hasUnsavedItineraryOrder) {
      return;
    }

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
          excludeFromRoute: visit.excludeFromRoute,
          id: visit.id,
          location: visit.location,
          note: visit.note,
          park: visit.park,
          route: visit.route,
          updatedAt: visit.updatedAt,
          visitedOn: visit.visitedOn,
        },
      },
    ] satisfies TripItineraryItem[];

    setPendingAction(`visit-${visit.id}-attach`);
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
      await revalidatePublicCache({ parkSlug: visit.park.slug, tripSlug: trip.slug });
      setSavedItineraryOrder(getItineraryOrderKeys(nextItinerary));
      setStatusMessage(t("attachSuccess"));
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      setVisitsState(previousVisitsState);
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingAction(null);
    }
  };

  const handleToggleVisitExcludeFromRoute = async (visitId: number, excludeFromRoute: boolean) => {
    if (pendingKeyRef.current !== null || hasUnsavedItineraryOrder) {
      return;
    }

    const previousItinerary = itineraryRef.current;
    const previousVisitsState = visitsState;
    const visit = visitsState.find((currentVisit) => currentVisit.id === visitId);

    if (!visit) {
      return;
    }

    setPendingAction(`visit-${visitId}-exclude`);
    setActionError(null);
    setStatusMessage(null);
    setItineraryWithRef((currentItinerary) =>
      currentItinerary.map((item) =>
        item.kind === "visit" && item.visit.id === visitId
          ? updateItineraryVisitExcludeFromRoute(item, excludeFromRoute)
          : item,
      ),
    );
    setVisitsState((currentVisits) =>
      currentVisits.map((currentVisit) =>
        currentVisit.id === visitId
          ? {
              ...currentVisit,
              excludeFromRoute,
            }
          : currentVisit,
      ),
    );

    try {
      await apiFetch(`/api/visits/${visitId}`, {
        method: "PATCH",
        body: JSON.stringify({
          excludeFromRoute,
        }),
      });
      await revalidatePublicCache({ parkSlug: visit.park.slug, tripSlug: trip.slug });
      setStatusMessage(excludeFromRoute ? t("routeExclusionSuccess") : t("routeInclusionSuccess"));
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      setVisitsState(previousVisitsState);
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingAction(null);
    }
  };

  const handleRemoveVisit = async (visitId: number) => {
    if (pendingKeyRef.current !== null || hasUnsavedItineraryOrder) {
      return;
    }

    const previousItinerary = itineraryRef.current;
    const previousVisitsState = visitsState;
    const visit = visitsState.find((currentVisit) => currentVisit.id === visitId);

    if (!visit) {
      return;
    }

    const nextItinerary = reindexItinerary(
      previousItinerary.filter((item) => !(item.kind === "visit" && item.visit.id === visitId)),
    );

    setPendingAction(`visit-${visitId}-remove`);
    setActionError(null);
    setStatusMessage(null);
    setItineraryWithRef(nextItinerary);
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
      await revalidatePublicCache({ parkSlug: visit.park.slug, tripSlug: trip.slug });
      setSavedItineraryOrder(getItineraryOrderKeys(nextItinerary));
      setStatusMessage(t("detachSuccess"));
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      setVisitsState(previousVisitsState);
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingAction(null);
    }
  };

  const handleSubmitStop = async () => {
    if (pendingKeyRef.current !== null || hasUnsavedItineraryOrder) {
      return;
    }

    const nextErrors: Record<string, string> = {};

    if (editingStopId !== null && !hasStopDetailChanges) {
      clearStopForm();
      return;
    }

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
                displayName: normalizedStopDisplayName,
                location: selectedStopLocation,
                note: normalizedStopNote,
                visitedOn: stopVisitedOn,
              },
            }
          : item,
      );

      setPendingAction(`stop-${editingStopId}-update`);
      setItineraryWithRef(nextItinerary);

      try {
        const updatedStop = await apiFetch<TripStop>(`/api/trip-stops/${editingStopId}`, {
          method: "PATCH",
          body: JSON.stringify({
            displayName: normalizedStopDisplayName,
            location: selectedStopLocation,
            note: normalizedStopNote,
            visitedOn: stopVisitedOn,
          } satisfies TripStopUpdateRequest),
        });

        setItineraryWithRef((currentItinerary) =>
          currentItinerary.map((item) =>
            item.kind === "stop" && item.stop.id === editingStopId
              ? {
                  ...item,
                  stop: {
                    ...updatedStop,
                    images: item.stop.images,
                  },
                  tripStopOrder: updatedStop.tripStopOrder,
                }
              : item,
          ),
        );
        await revalidatePublicCache({ tripSlug: trip.slug });
        setStatusMessage(t("stopUpdateSuccess"));
        clearStopForm();
        router.refresh();
      } catch (error) {
        itineraryRef.current = previousItinerary;
        setItinerary(previousItinerary);
        setActionError(error instanceof Error ? error.message : String(error));
      } finally {
        setPendingAction(null);
      }

      return;
    }

    const previousItinerary = itineraryRef.current;
    const selectedStopLocation = stopLocation;

    if (selectedStopLocation === null) {
      return;
    }

    const requestedTripStopOrder = Number(stopOrder) || previousItinerary.length + 1;

    setPendingAction("stop-create");

    try {
      const createdStop = await apiFetch<TripStop>(`/api/trips/${trip.id}/stops`, {
        method: "POST",
        body: JSON.stringify({
          displayName: normalizedStopDisplayName,
          location: selectedStopLocation,
          note: normalizedStopNote,
          tripStopOrder: requestedTripStopOrder,
          visitedOn: stopVisitedOn,
        } satisfies TripStopCreateRequest),
      });

      const nextItinerary = insertStopIntoItinerary(
        previousItinerary,
        createdStop,
        createdStop.tripStopOrder,
      );

      setItineraryWithRef(nextItinerary);
      await revalidatePublicCache({ tripSlug: trip.slug });
      setSavedItineraryOrder(getItineraryOrderKeys(nextItinerary));
      setStatusMessage(t("stopCreateSuccess"));
      setEditingStopId(createdStop.id);
      setIsStopFormOpen(false);
      setStopLocationQuery(createdStop.location.label);
      setStopLocation(createdStop.location);
      setStopDisplayName(createdStop.displayName ?? "");
      setStopOrder(String(createdStop.tripStopOrder));
      setStopVisitedOn(createdStop.visitedOn);
      setStopLocationStatus("idle");
      setStopNote(createdStop.note ?? "");
      setStopErrors({});
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingAction(null);
    }
  };

  const handleDeleteStop = async (stop: TripStop) => {
    if (pendingKeyRef.current !== null || hasUnsavedItineraryOrder) {
      return;
    }

    if (!window.confirm(t("deleteStopConfirm", { locationLabel: getTripStopDisplayName(stop) }))) {
      return;
    }

    const previousItinerary = itineraryRef.current;
    const nextItinerary = reindexItinerary(
      previousItinerary.filter((item) => !(item.kind === "stop" && item.stop.id === stop.id)),
    );

    setPendingAction(`stop-${stop.id}-delete`);
    setActionError(null);
    setStatusMessage(null);
    setItineraryWithRef(nextItinerary);

    try {
      await apiFetch(`/api/trip-stops/${stop.id}`, {
        method: "DELETE",
      });
      await revalidatePublicCache({ tripSlug: trip.slug });
      setSavedItineraryOrder(getItineraryOrderKeys(nextItinerary));
      setStatusMessage(t("stopDeleteSuccess"));
      if (editingStopId === stop.id) {
        clearStopForm();
      }
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingAction(null);
    }
  };

  const renderFeedback = () => (
    <>
      {statusMessage !== null && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{statusMessage}</p>
      )}
      {actionError !== null && <p className="text-sm text-destructive">{actionError}</p>}
    </>
  );

  const stopDialog =
    isStopFormVisible && typeof document !== "undefined"
      ? createPortal(
          <dialog
            open
            aria-labelledby="trip-stop-dialog-title"
            aria-modal="true"
            className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none overflow-hidden border-none bg-transparent p-0"
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={handleCloseStopForm}
              aria-label={t("closeStopDialog")}
            />
            <div className="relative flex h-full w-full items-center justify-center px-4 py-6 sm:px-6">
              <section className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-[1.8rem] border border-white/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] shadow-[0_32px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.94),rgba(15,23,42,0.92))]">
                <div className="flex items-start justify-between gap-4 border-b border-white/35 px-5 py-4 dark:border-white/10 sm:px-6">
                  <div className="flex items-start gap-3">
                    <Milestone className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <h4 id="trip-stop-dialog-title" className="text-lg font-semibold">
                        {isEditingStop ? t("editStopTitle") : t("addStopTitle")}
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isEditingStop ? t("editStopDescription") : t("addStopDescription")}
                      </p>
                    </div>
                  </div>
                  <button
                    ref={stopDialogCloseButtonRef}
                    type="button"
                    onClick={handleCloseStopForm}
                    disabled={isBusy}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/80 text-foreground/72 shadow-[0_8px_20px_rgba(148,163,184,0.18)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/56 dark:text-sky-100/72 dark:hover:bg-slate-950/72"
                    aria-label={t("closeStopDialog")}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
                  <div className="space-y-5">
                    {renderFeedback()}

                    {!isEditingStop && (
                      <div className="space-y-2">
                        <label htmlFor="trip-stop-order" className="text-sm font-medium">
                          {t("stopOrderLabel")}
                        </label>
                        <select
                          id="trip-stop-order"
                          value={stopOrder}
                          onChange={(event) => setStopOrder(event.target.value)}
                          disabled={isBusy}
                          className="flex h-10 w-full rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm ring-offset-background shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        >
                          {stopOrderOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-sm text-muted-foreground">{t("stopOrderHint")}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="trip-stop-visited-on" className="text-sm font-medium">
                        {t("stopVisitedOnLabel")}
                      </label>
                      <select
                        id="trip-stop-visited-on"
                        value={stopVisitedOn}
                        onChange={(event) => setStopVisitedOn(event.target.value)}
                        disabled={isBusy}
                        className="flex h-10 w-full rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm ring-offset-background shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      >
                        <option value="">{t("stopVisitedOnPlaceholder")}</option>
                        {tripDateOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {stopErrors.visitedOn !== undefined && (
                        <p className="text-sm text-destructive">{stopErrors.visitedOn}</p>
                      )}
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
                      {stopErrors.location !== undefined && (
                        <p className="text-sm text-destructive">{stopErrors.location}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="trip-stop-display-name" className="text-sm font-medium">
                        {t("stopDisplayNameLabel")}
                      </label>
                      <input
                        id="trip-stop-display-name"
                        type="text"
                        value={stopDisplayName}
                        onChange={(event) => setStopDisplayName(event.target.value)}
                        disabled={isBusy}
                        placeholder={t("stopDisplayNamePlaceholder")}
                        className="flex h-10 w-full rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm ring-offset-background shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      />
                      <p className="text-sm text-muted-foreground">{t("stopDisplayNameHint")}</p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="trip-stop-note" className="text-sm font-medium">
                        {t("stopNoteLabel")}
                      </label>
                      <TextareaWithCounter
                        id="trip-stop-note"
                        rows={4}
                        value={stopNote}
                        onValueChange={setStopNote}
                        disabled={isBusy}
                        placeholder={t("stopNotePlaceholder")}
                        className="flex w-full resize-y rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm ring-offset-background shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      />
                    </div>

                    {activeEditingStop !== null ? (
                      <TripStopImageSection
                        stopId={activeEditingStop.id}
                        images={activeEditingStop.images}
                        onImagesChange={(images) => updateStopImages(activeEditingStop.id, images)}
                        tripSlug={trip.slug}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("saveStopBeforeImages")}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/35 px-5 py-4 dark:border-white/10 sm:px-6">
                  <button
                    type="button"
                    onClick={handleCloseStopForm}
                    disabled={isBusy}
                    className="text-sm text-muted-foreground underline hover:text-foreground"
                  >
                    {isEditingStop ? t("cancelStopEdit") : t("cancelStopAdd")}
                  </button>
                  <Button
                    type="button"
                    disabled={isActionLocked || isStopSubmitBlockedByLength}
                    onClick={() =>
                      isEditingStop && !hasStopDetailChanges
                        ? handleCloseStopForm()
                        : void handleSubmitStop()
                    }
                  >
                    {(pendingKey === "stop-create" || pendingKey?.startsWith("stop-") === true) &&
                      "..."}
                    {!(pendingKey === "stop-create" || pendingKey?.startsWith("stop-") === true) &&
                      (isEditingStop
                        ? hasStopDetailChanges
                          ? t("saveStopChanges")
                          : t("closeStopEdit")
                        : t("addStopAction"))}
                  </Button>
                </div>
              </section>
            </div>
          </dialog>,
          document.body,
        )
      : null;

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

      {!isStopFormVisible && renderFeedback()}

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
              {!isStopFormVisible && (
                <div className="flex flex-col items-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-haspopup="dialog"
                    aria-expanded={false}
                    disabled={isActionLocked || !canOpenStopForm}
                    onClick={openStopForm}
                  >
                    {t("addStopAction")}
                  </Button>
                </div>
              )}
            </div>
            <p id="trip-itinerary-reorder-hint" className="mt-2 text-sm text-muted-foreground">
              {t("reorderHint")}
            </p>
            {hasUnsavedItineraryOrder && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void persistItineraryOrder(itineraryRef.current)}
                  disabled={isSaveOrderDisabled}
                  className="w-fit"
                >
                  {pendingKey === "reorder-save" ? t("savingOrder") : t("saveOrder")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRestoreItineraryOrder}
                  disabled={isSaveOrderDisabled}
                  className="w-fit"
                >
                  {t("restoreOrder")}
                </Button>
              </div>
            )}
            {!isStopFormVisible && stopAddBlockedMessage !== null && (
              <p className="mt-2 text-sm text-muted-foreground">{stopAddBlockedMessage}</p>
            )}
          </div>

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
                    const isPending = pendingKey?.startsWith(`${itemKey}-`) ?? false;
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
                              disabled={isReorderDisabled}
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
                              <>
                                {item.visit.route !== null && (
                                  <p className="text-sm text-muted-foreground">
                                    {item.visit.route}
                                  </p>
                                )}
                                {item.visit.excludeFromRoute === true && (
                                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                    {t("excludedFromRoute")}
                                  </p>
                                )}
                              </>
                            ) : (
                              item.stop.note !== null && (
                                <p className="text-sm text-muted-foreground">
                                  {createPreviewText(item.stop.note, 50)}
                                </p>
                              )
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-muted-foreground">
                          {isVisit ? item.visit.visitedOn : item.stop.visitedOn}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {isVisit ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isActionLocked}
                                  onClick={() =>
                                    void handleToggleVisitExcludeFromRoute(
                                      item.visit.id,
                                      !item.visit.excludeFromRoute,
                                    )
                                  }
                                >
                                  {isPending
                                    ? "..."
                                    : item.visit.excludeFromRoute
                                      ? t("includeInRouteAction")
                                      : t("excludeFromRouteAction")}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isActionLocked}
                                  onClick={() => void handleRemoveVisit(item.visit.id)}
                                >
                                  {isPending ? "..." : t("removeVisitAction")}
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isActionLocked}
                                  onClick={() => handleStartStopEdit(item.stop)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                                  {t("editStopAction")}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isActionLocked}
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
                className="max-h-144 overflow-y-auto rounded-[1.3rem] border border-white/35 dark:border-white/8"
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
                            {visit.route !== null && (
                              <p className="text-sm text-muted-foreground">{visit.route}</p>
                            )}
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
                            disabled={isActionLocked}
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
      {stopDialog}
    </section>
  );
};
