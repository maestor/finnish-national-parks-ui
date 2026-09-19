"use client";

import { GripVertical, MapPinned, Milestone, Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AdminTableFilters } from "@/components/admin/admin-table-filters";
import { LocationSuggestionInput } from "@/components/location/location-suggestion-input";
import { useSnackbar } from "@/components/providers/snackbar-provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
  type TripItineraryRouteWaypointItem,
  type TripItineraryStopItem,
  type TripItineraryVisitItem,
  type TripLocation,
  type TripRouteWaypoint,
  type TripRouteWaypointCreateRequest,
  type TripRouteWaypointUpdateRequest,
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
  | "locationRateLimited"
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

interface ItineraryDropTarget {
  shouldMove: boolean;
  targetKey: string | null;
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
    : item.kind === "stop"
      ? {
          ...item,
          tripStopOrder,
          stop: {
            ...item.stop,
            tripStopOrder,
          },
        }
      : {
          ...item,
          tripStopOrder,
          routeWaypoint: {
            ...item.routeWaypoint,
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
  item.kind === "visit"
    ? `visit-${item.visit.id}`
    : item.kind === "stop"
      ? `stop-${item.stop.id}`
      : `route-waypoint-${item.routeWaypoint.id}`;

const getItineraryOrderKeys = (items: TripItineraryItem[]) => items.map(getItineraryItemKey);

const getItineraryItemLabel = (item: TripItineraryItem) =>
  item.kind === "visit"
    ? item.visit.park.name
    : item.kind === "stop"
      ? getTripStopDisplayName(item.stop)
      : item.routeWaypoint.location.displayName;

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

const reorderItineraryItemBefore = (
  items: TripItineraryItem[],
  activeKey: string,
  targetKey: string,
) => {
  const activeIndex = items.findIndex((item) => getItineraryItemKey(item) === activeKey);

  if (activeIndex === -1) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(activeIndex, 1);
  const targetIndex = nextItems.findIndex((item) => getItineraryItemKey(item) === targetKey);

  if (targetIndex === -1) {
    return items;
  }

  nextItems.splice(targetIndex, 0, movedItem);
  return reindexItinerary(nextItems);
};

const reorderItineraryItemToEnd = (items: TripItineraryItem[], activeKey: string) => {
  const activeIndex = items.findIndex((item) => getItineraryItemKey(item) === activeKey);

  if (activeIndex === -1) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(activeIndex, 1);
  nextItems.push(movedItem);
  return reindexItinerary(nextItems);
};

const doItineraryOrdersMatch = (left: string[], right: string[]) =>
  left.length === right.length && left.every((itemKey, index) => itemKey === right[index]);

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

const getItineraryDropTarget = (
  dragLayout: ItineraryDragLayoutItem[],
  clientX: number,
  clientY: number,
  activeKey: string,
): ItineraryDropTarget => {
  const noMove = { shouldMove: false, targetKey: null } satisfies ItineraryDropTarget;

  if (dragLayout.length === 0) {
    return noMove;
  }

  const listLeft = Math.min(...dragLayout.map((item) => item.left));
  const listRight = Math.max(...dragLayout.map((item) => item.right));

  if (clientX < listLeft || clientX > listRight) {
    return noMove;
  }

  const activeIndex = dragLayout.findIndex((item) => item.itemKey === activeKey);
  const activeItem = dragLayout[activeIndex];

  if (!activeItem || (clientY >= activeItem.top && clientY <= activeItem.bottom)) {
    return noMove;
  }

  if (clientY < activeItem.top) {
    const targetItem = dragLayout.slice(0, activeIndex).find((item) => clientY < item.centerY);

    if (!targetItem) {
      return noMove;
    }

    return {
      shouldMove: true,
      targetKey: targetItem.itemKey,
    };
  }

  const itemsAfterActive = dragLayout.slice(activeIndex + 1);
  const lastCrossedIndex = itemsAfterActive.findLastIndex((item) => clientY >= item.centerY);

  if (lastCrossedIndex === -1) {
    return noMove;
  }

  return {
    shouldMove: true,
    targetKey: itemsAfterActive[lastCrossedIndex + 1]?.itemKey ?? null,
  };
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
    case "rateLimited":
      return t("locationRateLimited");
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

const insertRouteWaypointIntoItinerary = (
  items: TripItineraryItem[],
  routeWaypoint: TripRouteWaypoint,
  tripStopOrder: number,
) => {
  const nextItems = [...items];

  nextItems.splice(Math.max(tripStopOrder - 1, 0), 0, {
    kind: "route-waypoint",
    routeWaypoint: { ...routeWaypoint, tripStopOrder },
    tripStopOrder,
  } satisfies TripItineraryRouteWaypointItem);

  return reindexItinerary(nextItems);
};

export const TripVisitAssignments = ({ trip, visits }: TripVisitAssignmentsProps) => {
  const t = useTranslations("controlPanel.trips.assignments");
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const tripIdRef = useRef(trip.id);
  const tripPropItineraryOrderRef = useRef(
    getItineraryOrderKeys(normalizeItinerary(trip.itinerary)),
  );
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
  const [editingRouteWaypointId, setEditingRouteWaypointId] = useState<number | null>(null);
  const [isRouteWaypointFormOpen, setIsRouteWaypointFormOpen] = useState(false);
  const [routeWaypointLocationQuery, setRouteWaypointLocationQuery] = useState("");
  const [routeWaypointLocation, setRouteWaypointLocation] = useState<TripLocation | null>(null);
  const [routeWaypointOrder, setRouteWaypointOrder] = useState("");
  const [routeWaypointLocationStatus, setRouteWaypointLocationStatus] =
    useState<UserLocationStatus>("idle");
  const [routeWaypointErrors, setRouteWaypointErrors] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [activeItineraryDrag, setActiveItineraryDrag] = useState<ActiveItineraryDrag | null>(null);
  const itineraryRef = useRef(itinerary);
  const savedItineraryOrderRef = useRef(savedItineraryOrder);
  const pendingKeyRef = useRef<string | null>(null);
  const activeItineraryDragRef = useRef<ActiveItineraryDrag | null>(null);
  const itineraryDragLayoutRef = useRef<ItineraryDragLayoutItem[] | null>(null);
  const itineraryDragTableRef = useRef<HTMLTableElement | null>(null);
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
    const previousTripPropOrder = tripPropItineraryOrderRef.current;
    const shouldKeepLocalOrder =
      isSameTrip &&
      !doItineraryOrdersMatch(nextSavedOrder, currentItineraryOrder) &&
      ((hasUnsavedLocalOrder && doItineraryOrdersMatch(nextSavedOrder, currentSavedOrder)) ||
        doItineraryOrdersMatch(nextSavedOrder, previousTripPropOrder));

    tripIdRef.current = trip.id;

    if (shouldKeepLocalOrder) {
      return;
    }

    tripPropItineraryOrderRef.current = nextSavedOrder;
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

  useLayoutEffect(() => {
    if (activeItineraryDragRef.current?.isDragging !== true) {
      return;
    }

    const table = itineraryDragTableRef.current;

    if (table !== null) {
      itineraryDragLayoutRef.current = captureItineraryDragLayout(table);
    }
  });

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
  const routeWaypointLocationStatusMessage = getLocationStatusMessage(
    routeWaypointLocationStatus,
    t,
  );
  const isBusy = pendingKey !== null;
  const isActionLocked = isBusy;
  const isEditingStop = editingStopId !== null;
  const isStopFormVisible = Boolean(isStopFormOpen || isEditingStop);
  const isEditingRouteWaypoint = editingRouteWaypointId !== null;
  const isRouteWaypointFormVisible = Boolean(isRouteWaypointFormOpen || isEditingRouteWaypoint);
  const isEditorVisible = isStopFormVisible || isRouteWaypointFormVisible;
  const isReorderDisabled = isBusy || isEditorVisible;
  const activeEditingStop =
    editingStopId === null
      ? null
      : (itinerary.find(
          (item): item is TripItineraryStopItem =>
            item.kind === "stop" && item.stop.id === editingStopId,
        )?.stop ?? null);
  const activeEditingRouteWaypoint =
    editingRouteWaypointId === null
      ? null
      : (itinerary.find(
          (item): item is TripItineraryRouteWaypointItem =>
            item.kind === "route-waypoint" && item.routeWaypoint.id === editingRouteWaypointId,
        )?.routeWaypoint ?? null);
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
  const canOpenRouteWaypointForm = true;
  const stopOrderOptions = itinerary.map((item, index) => {
    const order = index + 1;

    if (index === 0) {
      return {
        label: `${order} - ${t("stopOrderFirst")}`,
        value: String(order),
      };
    }

    const previousItem = itinerary[index - 1] ?? item;
    const previousKindLabel =
      previousItem.kind === "visit"
        ? t("visitBadge")
        : previousItem.kind === "stop"
          ? t("stopBadge")
          : t("routeWaypointBadge");

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

  const setItineraryWithRef = useEffectEvent(
    (
      updater:
        | TripItineraryItem[]
        | ((currentItinerary: TripItineraryItem[]) => TripItineraryItem[]),
    ) => {
      const currentItinerary = itineraryRef.current;
      const nextItinerary = typeof updater === "function" ? updater(currentItinerary) : updater;
      itineraryRef.current = nextItinerary;
      setItinerary(nextItinerary);
    },
  );

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

  const clearRouteWaypointForm = () => {
    setIsRouteWaypointFormOpen(false);
    setEditingRouteWaypointId(null);
    setRouteWaypointLocationQuery("");
    setRouteWaypointLocation(null);
    setRouteWaypointOrder("");
    setRouteWaypointLocationStatus("idle");
    setRouteWaypointErrors({});
  };

  const handleCloseStopForm = (options: { allowWhileBusy?: boolean } = {}) => {
    if (pendingKeyRef.current !== null && options.allowWhileBusy !== true) {
      return;
    }

    clearStopForm();
    clearRouteWaypointForm();
  };

  const openStopForm = () => {
    if (pendingKeyRef.current !== null) {
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
  };

  const openRouteWaypointForm = () => {
    if (pendingKeyRef.current !== null) {
      return;
    }

    previousStopDialogFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsRouteWaypointFormOpen(true);
    setEditingRouteWaypointId(null);
    setRouteWaypointLocationQuery("");
    setRouteWaypointLocation(null);
    setRouteWaypointOrder(String(itineraryRef.current.length + 1));
    setRouteWaypointLocationStatus("idle");
    setRouteWaypointErrors({});
  };

  const handleStopLocationValueChange = (value: string) => {
    if (stopLocationStatus !== "locating") {
      setStopLocationStatus("idle");
    }

    setStopLocationQuery(value);
  };

  const handleLocateStop = () => {
    if (pendingKeyRef.current !== null) {
      return;
    }

    const geolocation = window.navigator.geolocation;

    if (!geolocation) {
      setStopLocationStatus("unsupported");
      return;
    }

    setStopLocationStatus("locating");

    geolocation.getCurrentPosition(
      async (position) => {
        const resolved = await resolveLocationFromCoordinate({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });

        setStopLocationQuery(resolved.location.label);
        setStopLocation(resolved.location);
        setStopLocationStatus(resolved.rateLimited ? "rateLimited" : "idle");
      },
      (error) => {
        setStopLocationStatus(getUserLocationStatusFromError(error));
      },
      LOCATION_REQUEST_OPTIONS,
    );
  };

  const handleStartStopEdit = (stop: TripStop) => {
    if (pendingKeyRef.current !== null) {
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
  };

  const handleStartRouteWaypointEdit = (routeWaypoint: TripRouteWaypoint) => {
    if (pendingKeyRef.current !== null) {
      return;
    }

    previousStopDialogFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsRouteWaypointFormOpen(true);
    setEditingRouteWaypointId(routeWaypoint.id);
    setRouteWaypointLocationQuery(routeWaypoint.location.label);
    setRouteWaypointLocation(routeWaypoint.location);
    setRouteWaypointOrder(String(routeWaypoint.tripStopOrder));
    setRouteWaypointLocationStatus("idle");
    setRouteWaypointErrors({});
  };

  const handleRouteWaypointLocationValueChange = (value: string) => {
    if (routeWaypointLocationStatus !== "locating") {
      setRouteWaypointLocationStatus("idle");
    }

    setRouteWaypointLocationQuery(value);
  };

  const handleLocateRouteWaypoint = () => {
    if (pendingKeyRef.current !== null) {
      return;
    }

    const geolocation = window.navigator.geolocation;

    if (!geolocation) {
      setRouteWaypointLocationStatus("unsupported");
      return;
    }

    setRouteWaypointLocationStatus("locating");
    geolocation.getCurrentPosition(
      async (position) => {
        const resolved = await resolveLocationFromCoordinate({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });

        setRouteWaypointLocationQuery(resolved.location.label);
        setRouteWaypointLocation(resolved.location);
        setRouteWaypointLocationStatus(resolved.rateLimited ? "rateLimited" : "idle");
      },
      (error) => {
        setRouteWaypointLocationStatus(getUserLocationStatusFromError(error));
      },
      LOCATION_REQUEST_OPTIONS,
    );
  };

  const handleStopFormEscape = useEffectEvent(() => {
    if (pendingKeyRef.current !== null) {
      return;
    }

    handleCloseStopForm();
  });

  useEffect(() => {
    if (!isEditorVisible) {
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
  }, [isEditorVisible]);

  const persistItineraryOrder = useEffectEvent(async (nextItinerary: TripItineraryItem[]) => {
    if (pendingKeyRef.current !== null) {
      return;
    }

    const savedOrder = savedItineraryOrderRef.current;
    const changedItems = nextItinerary.filter((item, index) => {
      return savedOrder[index] !== getItineraryItemKey(item);
    });

    if (changedItems.length === 0) {
      return;
    }

    setPendingAction("reorder-save");

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
        } else if (item.kind === "stop") {
          await apiFetch(`/api/trip-stops/${item.stop.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              tripStopOrder: item.tripStopOrder,
            } satisfies TripStopUpdateRequest),
          });
        } else {
          await apiFetch(`/api/trip-route-waypoints/${item.routeWaypoint.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              tripStopOrder: item.tripStopOrder,
            } satisfies TripRouteWaypointUpdateRequest),
          });
        }
      }

      await revalidatePublicCache({ tripSlug: trip.slug });
      const nextSavedOrder = getItineraryOrderKeys(nextItinerary);
      savedItineraryOrderRef.current = nextSavedOrder;
      setSavedItineraryOrder(nextSavedOrder);
      showSnackbar({ message: t("reorderSuccess"), tone: "success" });
      router.refresh();
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : t("reorderFailed"),
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  });

  const previewItineraryMove = useEffectEvent((nextItinerary: TripItineraryItem[]) => {
    setItineraryWithRef(nextItinerary);
  });

  useEffect(() => {
    const clearItineraryDragState = () => {
      activeItineraryDragRef.current = null;
      itineraryDragLayoutRef.current = null;
      itineraryDragTableRef.current = null;
      dragStartItineraryRef.current = null;
      setActiveItineraryDrag(null);
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

      event.preventDefault();

      if (!currentDrag.isDragging) {
        const nextDrag = {
          ...currentDrag,
          isDragging: true,
        } satisfies ActiveItineraryDrag;

        activeItineraryDragRef.current = nextDrag;
        setActiveItineraryDrag(nextDrag);
      }

      const dropTarget = getItineraryDropTarget(
        itineraryDragLayoutRef.current ?? [],
        event.clientX,
        event.clientY,
        currentDrag.itemKey,
      );

      if (!dropTarget.shouldMove) {
        return;
      }

      const currentItinerary = itineraryRef.current;
      const nextItinerary =
        dropTarget.targetKey === null
          ? reorderItineraryItemToEnd(currentItinerary, currentDrag.itemKey)
          : reorderItineraryItemBefore(currentItinerary, currentDrag.itemKey, dropTarget.targetKey);

      if (
        !doItineraryOrdersMatch(
          getItineraryOrderKeys(currentItinerary),
          getItineraryOrderKeys(nextItinerary),
        )
      ) {
        previewItineraryMove(nextItinerary);
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

      void persistItineraryOrder(nextItinerary);
    };

    const handleWindowPointerCancel = (event: globalThis.PointerEvent) => {
      const currentDrag = activeItineraryDragRef.current;

      if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
        return;
      }

      const previousItinerary = dragStartItineraryRef.current;

      if (previousItinerary) {
        setItineraryWithRef(previousItinerary);
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
    await persistItineraryOrder(nextItinerary);
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

      event.preventDefault();
      if (typeof event.currentTarget.setPointerCapture === "function") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      dragStartItineraryRef.current = itineraryRef.current;
      itineraryDragTableRef.current = event.currentTarget.closest("table");
      itineraryDragLayoutRef.current = captureItineraryDragLayout(
        itineraryDragTableRef.current ?? document,
      );
      activeItineraryDragRef.current = nextDrag;
      setActiveItineraryDrag(nextDrag);
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
    if (pendingKeyRef.current !== null) {
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
      showSnackbar({ message: t("attachSuccess"), tone: "success" });
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      setVisitsState(previousVisitsState);
      showSnackbar({
        message: error instanceof Error ? error.message : String(error),
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleToggleVisitExcludeFromRoute = async (visitId: number, excludeFromRoute: boolean) => {
    if (pendingKeyRef.current !== null) {
      return;
    }

    const previousItinerary = itineraryRef.current;
    const previousVisitsState = visitsState;
    const visit = visitsState.find((currentVisit) => currentVisit.id === visitId);

    if (!visit) {
      return;
    }

    setPendingAction(`visit-${visitId}-exclude`);
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
      showSnackbar({
        message: excludeFromRoute ? t("routeExclusionSuccess") : t("routeInclusionSuccess"),
        tone: "success",
      });
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      setVisitsState(previousVisitsState);
      showSnackbar({
        message: error instanceof Error ? error.message : String(error),
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleRemoveVisit = async (visitId: number) => {
    if (pendingKeyRef.current !== null) {
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
      showSnackbar({ message: t("detachSuccess"), tone: "success" });
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      setVisitsState(previousVisitsState);
      showSnackbar({
        message: error instanceof Error ? error.message : String(error),
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleSubmitStop = async () => {
    if (pendingKeyRef.current !== null) {
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
        showSnackbar({ message: t("stopUpdateSuccess"), tone: "success" });
        clearStopForm();
        router.refresh();
      } catch (error) {
        itineraryRef.current = previousItinerary;
        setItinerary(previousItinerary);
        showSnackbar({
          message: error instanceof Error ? error.message : String(error),
          tone: "error",
        });
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
      showSnackbar({ message: t("stopCreateSuccess"), tone: "success" });
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
      showSnackbar({
        message: error instanceof Error ? error.message : String(error),
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleSubmitRouteWaypoint = async () => {
    if (pendingKeyRef.current !== null) {
      return;
    }

    const nextErrors: Record<string, string> = {};
    const normalizedLocationQuery = routeWaypointLocationQuery.trim();

    if (!normalizedLocationQuery) {
      nextErrors.location = t("validation.routeWaypointLocationRequired");
    } else if (routeWaypointLocation === null) {
      nextErrors.location = t("validation.routeWaypointLocationSelectionRequired");
    }

    if (Object.keys(nextErrors).length > 0) {
      setRouteWaypointErrors(nextErrors);
      return;
    }

    if (routeWaypointLocation === null) {
      return;
    }

    const previousItinerary = itineraryRef.current;
    const activeLocation = activeEditingRouteWaypoint?.location ?? null;
    const hasLocationChanges =
      !doTripLocationsMatch(routeWaypointLocation, activeLocation) ||
      normalizedLocationQuery !== (activeLocation?.label ?? null);

    if (editingRouteWaypointId !== null && !hasLocationChanges) {
      handleCloseStopForm();
      return;
    }

    setRouteWaypointErrors({});

    if (editingRouteWaypointId !== null) {
      const nextItinerary = previousItinerary.map((item) =>
        item.kind === "route-waypoint" && item.routeWaypoint.id === editingRouteWaypointId
          ? {
              ...item,
              routeWaypoint: {
                ...item.routeWaypoint,
                location: routeWaypointLocation,
              },
            }
          : item,
      );

      setPendingAction(`route-waypoint-${editingRouteWaypointId}-update`);
      setItineraryWithRef(nextItinerary);

      try {
        const updatedRouteWaypoint = await apiFetch<TripRouteWaypoint>(
          `/api/trip-route-waypoints/${editingRouteWaypointId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              location: routeWaypointLocation,
            } satisfies TripRouteWaypointUpdateRequest),
          },
        );
        setItineraryWithRef((currentItinerary) =>
          currentItinerary.map((item) =>
            item.kind === "route-waypoint" && item.routeWaypoint.id === editingRouteWaypointId
              ? { ...item, routeWaypoint: updatedRouteWaypoint }
              : item,
          ),
        );
        await revalidatePublicCache({ tripSlug: trip.slug });
        showSnackbar({ message: t("routeWaypointUpdateSuccess"), tone: "success" });
        handleCloseStopForm({ allowWhileBusy: true });
        router.refresh();
      } catch (error) {
        itineraryRef.current = previousItinerary;
        setItinerary(previousItinerary);
        showSnackbar({
          message: error instanceof Error ? error.message : t("routeWaypointUpdateFailed"),
          tone: "error",
        });
      } finally {
        setPendingAction(null);
      }

      return;
    }

    const requestedTripStopOrder = Number(routeWaypointOrder) || previousItinerary.length + 1;
    setPendingAction("route-waypoint-create");

    try {
      const createdRouteWaypoint = await apiFetch<TripRouteWaypoint>(
        `/api/trips/${trip.id}/route-waypoints`,
        {
          method: "POST",
          body: JSON.stringify({
            location: routeWaypointLocation,
            tripStopOrder: requestedTripStopOrder,
          } satisfies TripRouteWaypointCreateRequest),
        },
      );
      const nextItinerary = insertRouteWaypointIntoItinerary(
        previousItinerary,
        createdRouteWaypoint,
        createdRouteWaypoint.tripStopOrder,
      );
      setItineraryWithRef(nextItinerary);
      await revalidatePublicCache({ tripSlug: trip.slug });
      setSavedItineraryOrder(getItineraryOrderKeys(nextItinerary));
      showSnackbar({ message: t("routeWaypointCreateSuccess"), tone: "success" });
      handleCloseStopForm({ allowWhileBusy: true });
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      showSnackbar({
        message: error instanceof Error ? error.message : t("routeWaypointCreateFailed"),
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleDeleteRouteWaypoint = async (routeWaypoint: TripRouteWaypoint) => {
    if (pendingKeyRef.current !== null) {
      return;
    }

    if (
      !window.confirm(
        t("deleteRouteWaypointConfirm", { locationLabel: routeWaypoint.location.displayName }),
      )
    ) {
      return;
    }

    const previousItinerary = itineraryRef.current;
    const nextItinerary = reindexItinerary(
      previousItinerary.filter(
        (item) => !(item.kind === "route-waypoint" && item.routeWaypoint.id === routeWaypoint.id),
      ),
    );
    setPendingAction(`route-waypoint-${routeWaypoint.id}-delete`);
    setItineraryWithRef(nextItinerary);

    try {
      await apiFetch(`/api/trip-route-waypoints/${routeWaypoint.id}`, { method: "DELETE" });
      await revalidatePublicCache({ tripSlug: trip.slug });
      setSavedItineraryOrder(getItineraryOrderKeys(nextItinerary));
      showSnackbar({ message: t("routeWaypointDeleteSuccess"), tone: "success" });
      if (editingRouteWaypointId === routeWaypoint.id) {
        handleCloseStopForm();
      }
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      showSnackbar({
        message: error instanceof Error ? error.message : t("routeWaypointDeleteFailed"),
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleDeleteStop = async (stop: TripStop) => {
    if (pendingKeyRef.current !== null) {
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
    setItineraryWithRef(nextItinerary);

    try {
      await apiFetch(`/api/trip-stops/${stop.id}`, {
        method: "DELETE",
      });
      await revalidatePublicCache({ tripSlug: trip.slug });
      setSavedItineraryOrder(getItineraryOrderKeys(nextItinerary));
      showSnackbar({ message: t("stopDeleteSuccess"), tone: "success" });
      if (editingStopId === stop.id) {
        clearStopForm();
      }
      router.refresh();
    } catch (error) {
      itineraryRef.current = previousItinerary;
      setItinerary(previousItinerary);
      showSnackbar({
        message: error instanceof Error ? error.message : String(error),
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const stopDialog =
    isEditorVisible && typeof document !== "undefined"
      ? createPortal(
          <dialog
            open
            aria-labelledby={
              isRouteWaypointFormVisible
                ? "trip-route-waypoint-dialog-title"
                : "trip-stop-dialog-title"
            }
            aria-modal="true"
            className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none overflow-hidden border-none bg-transparent p-0"
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => handleCloseStopForm()}
              aria-label={t("closeStopDialog")}
            />
            <div className="relative flex h-full w-full items-center justify-center px-4 py-6 sm:px-6">
              <section className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-[1.8rem] border border-white/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] shadow-[0_32px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.94),rgba(15,23,42,0.92))]">
                <div className="flex items-start justify-between gap-4 border-b border-white/35 px-5 py-4 dark:border-white/10 sm:px-6">
                  <div className="flex items-start gap-3">
                    <Milestone className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
                    <div>
                      <h4
                        id={
                          isRouteWaypointFormVisible
                            ? "trip-route-waypoint-dialog-title"
                            : "trip-stop-dialog-title"
                        }
                        className="text-lg font-semibold"
                      >
                        {isRouteWaypointFormVisible
                          ? isEditingRouteWaypoint
                            ? t("editRouteWaypointTitle")
                            : t("addRouteWaypointTitle")
                          : isEditingStop
                            ? t("editStopTitle")
                            : t("addStopTitle")}
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isRouteWaypointFormVisible
                          ? t("routeWaypointDescription")
                          : isEditingStop
                            ? t("editStopDescription")
                            : t("addStopDescription")}
                      </p>
                    </div>
                  </div>
                  <button
                    ref={stopDialogCloseButtonRef}
                    type="button"
                    onClick={() => handleCloseStopForm()}
                    disabled={isBusy}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/80 text-foreground/72 shadow-[0_8px_20px_rgba(148,163,184,0.18)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/56 dark:text-sky-100/72 dark:hover:bg-slate-950/72"
                    aria-label={t("closeStopDialog")}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
                  <div className="space-y-5">
                    {isRouteWaypointFormVisible ? (
                      <>
                        {!isEditingRouteWaypoint && (
                          <div className="space-y-2">
                            <label
                              htmlFor="trip-route-waypoint-order"
                              className="text-sm font-medium"
                            >
                              {t("stopOrderLabel")}
                            </label>
                            <Select
                              id="trip-route-waypoint-order"
                              value={routeWaypointOrder}
                              onChange={(event) => setRouteWaypointOrder(event.target.value)}
                              disabled={isBusy}
                            >
                              {stopOrderOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </Select>
                          </div>
                        )}
                        <LocationSuggestionInput
                          assistiveMessage={routeWaypointLocationStatusMessage ?? undefined}
                          assistiveMessageTone={
                            routeWaypointLocationStatus !== "idle" &&
                            routeWaypointLocationStatus !== "locating"
                              ? "error"
                              : "default"
                          }
                          id="trip-route-waypoint-location"
                          inputClassName="h-10"
                          isLocating={routeWaypointLocationStatus === "locating"}
                          label={t("routeWaypointLocationLabel")}
                          locateButtonLabel={t("useCurrentLocation")}
                          name="routeWaypointLocation"
                          onLocate={handleLocateRouteWaypoint}
                          onSelectedLocationChange={setRouteWaypointLocation}
                          onValueChange={handleRouteWaypointLocationValueChange}
                          placeholder={t("routeWaypointLocationPlaceholder")}
                          required={false}
                          selectedLocation={routeWaypointLocation}
                          value={routeWaypointLocationQuery}
                        />
                        {routeWaypointErrors.location !== undefined && (
                          <p className="text-sm text-destructive" role="alert">
                            {routeWaypointErrors.location}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {t("routeWaypointVisibilityHint")}
                        </p>
                      </>
                    ) : (
                      <>
                        {!isEditingStop && (
                          <div className="space-y-2">
                            <label htmlFor="trip-stop-order" className="text-sm font-medium">
                              {t("stopOrderLabel")}
                            </label>
                            <Select
                              id="trip-stop-order"
                              value={stopOrder}
                              onChange={(event) => setStopOrder(event.target.value)}
                              disabled={isBusy}
                            >
                              {stopOrderOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </Select>
                            <p className="text-sm text-muted-foreground">{t("stopOrderHint")}</p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label htmlFor="trip-stop-visited-on" className="text-sm font-medium">
                            {t("stopVisitedOnLabel")}
                          </label>
                          <Select
                            id="trip-stop-visited-on"
                            value={stopVisitedOn}
                            onChange={(event) => setStopVisitedOn(event.target.value)}
                            disabled={isBusy}
                          >
                            <option value="">{t("stopVisitedOnPlaceholder")}</option>
                            {tripDateOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
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
                          <p className="text-sm text-muted-foreground">
                            {t("stopDisplayNameHint")}
                          </p>
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
                            onImagesChange={(images) =>
                              updateStopImages(activeEditingStop.id, images)
                            }
                            tripSlug={trip.slug}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {t("saveStopBeforeImages")}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/35 px-5 py-4 dark:border-white/10 sm:px-6">
                  <button
                    type="button"
                    onClick={() => handleCloseStopForm()}
                    disabled={isBusy}
                    className="text-sm text-muted-foreground underline hover:text-foreground"
                  >
                    {isRouteWaypointFormVisible
                      ? t("cancelRouteWaypoint")
                      : isEditingStop
                        ? t("cancelStopEdit")
                        : t("cancelStopAdd")}
                  </button>
                  <Button
                    type="button"
                    disabled={isActionLocked || isStopSubmitBlockedByLength}
                    onClick={() => {
                      if (isRouteWaypointFormVisible) {
                        void handleSubmitRouteWaypoint();
                        return;
                      }

                      if (isEditingStop && !hasStopDetailChanges) {
                        handleCloseStopForm();
                        return;
                      }

                      void handleSubmitStop();
                    }}
                  >
                    {(isBusy && isRouteWaypointFormVisible) ||
                    pendingKey === "stop-create" ||
                    pendingKey?.startsWith("stop-") === true
                      ? "..."
                      : isRouteWaypointFormVisible
                        ? isEditingRouteWaypoint
                          ? t("saveRouteWaypoint")
                          : t("addRouteWaypointAction")
                        : isEditingStop
                          ? hasStopDetailChanges
                            ? t("saveStopChanges")
                            : t("closeStopEdit")
                          : t("addStopAction")}
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
              {!isEditorVisible && (
                <div className="flex flex-wrap justify-end gap-2">
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
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-haspopup="dialog"
                    aria-expanded={false}
                    disabled={isActionLocked || !canOpenRouteWaypointForm}
                    onClick={openRouteWaypointForm}
                  >
                    {t("addRouteWaypointAction")}
                  </Button>
                </div>
              )}
            </div>
            <p id="trip-itinerary-reorder-hint" className="mt-2 text-sm text-muted-foreground">
              {t("reorderHint")}
            </p>
            {!isEditorVisible && stopAddBlockedMessage !== null && (
              <p className="mt-2 text-sm text-muted-foreground">{stopAddBlockedMessage}</p>
            )}
          </div>

          {itinerary.length === 0 ? (
            <div className="rounded-[1.3rem] border border-dashed border-white/45 bg-white/40 p-6 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-950/28">
              {t("assignedEmpty")}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[1.3rem] border border-white/35 dark:border-white/8">
              <table className="min-w-192 w-full text-sm">
                <thead className="bg-white/70 dark:bg-slate-950/52">
                  <tr>
                    <th className="w-20 px-4 py-3 text-center font-medium" title={t("table.order")}>
                      <span aria-hidden="true" title={t("table.order")}>
                        #
                      </span>
                      <span className="sr-only">{t("table.order")}</span>
                    </th>
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
                    const isRouteWaypoint = item.kind === "route-waypoint";
                    const itemLabel = getItineraryItemLabel(item);
                    const isDragging =
                      activeItineraryDrag?.isDragging === true &&
                      activeItineraryDrag.itemKey === itemKey;

                    return (
                      <tr
                        key={itemKey}
                        data-itinerary-item-key={itemKey}
                        className={[
                          "transition-[background-color,box-shadow] duration-150 hover:bg-white/56 dark:hover:bg-slate-950/42",
                          isDragging
                            ? "relative z-10 bg-emerald-50/85 shadow-[0_10px_24px_rgba(16,185,129,0.16)] dark:bg-emerald-500/12 dark:shadow-[0_12px_28px_rgba(16,185,129,0.12)]"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="flex w-16 flex-col items-center gap-2">
                            <span className="w-full text-center text-sm font-medium tabular-nums text-muted-foreground">
                              {item.tripStopOrder}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={t("table.reorderItem", { targetName: itemLabel })}
                              aria-describedby="trip-itinerary-reorder-hint"
                              className={[
                                "h-8 w-8 touch-none select-none cursor-grab rounded-full border border-white/35 bg-white/72 text-foreground/70 hover:bg-white/92 active:cursor-grabbing dark:border-white/10 dark:bg-slate-950/48 dark:text-sky-100/72 dark:hover:bg-slate-950/68",
                                isDragging
                                  ? "ring-2 ring-emerald-500/60 ring-offset-2 ring-offset-background dark:ring-emerald-300/50 dark:ring-offset-slate-950"
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
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
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-900 dark:bg-sky-950/60 dark:text-sky-200">
                                {isVisit
                                  ? t("visitBadge")
                                  : isRouteWaypoint
                                    ? t("routeWaypointBadge")
                                    : t("stopBadge")}
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
                            ) : isRouteWaypoint ? (
                              <p className="text-sm text-muted-foreground">
                                {t("routeWaypointPrivateNote")}
                              </p>
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
                          {isVisit
                            ? item.visit.visitedOn
                            : isRouteWaypoint
                              ? "—"
                              : item.stop.visitedOn}
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
                            ) : isRouteWaypoint ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isActionLocked}
                                  onClick={() => handleStartRouteWaypointEdit(item.routeWaypoint)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                                  {t("editRouteWaypointAction")}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isActionLocked}
                                  onClick={() => void handleDeleteRouteWaypoint(item.routeWaypoint)}
                                >
                                  {isPending ? "..." : t("deleteRouteWaypointAction")}
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
                className="max-h-144 overflow-x-auto overflow-y-auto rounded-[1.3rem] border border-white/35 dark:border-white/8"
              >
                <table className="min-w-144 w-full table-fixed text-sm">
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
