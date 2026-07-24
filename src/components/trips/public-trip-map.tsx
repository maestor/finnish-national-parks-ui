"use client";

import * as maplibregl from "maplibre-gl";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { formatFinnishDate } from "@/lib/fi-date";
import { createParkVisitHref } from "@/lib/public-visits";
import type { PublicTripDetail, PublicTripRoute } from "@/lib/trips";
import { getMapStyle } from "../map/map-style";
import "maplibre-gl/dist/maplibre-gl.css";

interface PublicTripMapProps {
  route: PublicTripRoute | null;
  startingPoint: NonNullable<PublicTripDetail["startingPoint"]>;
  tripName: string;
  tripStops: PublicTripDetail["itinerary"];
}

interface TripMapPoint {
  coordinate: {
    lat: number;
    lon: number;
  };
  href?: string;
  index: number;
  kind: "stop" | "visit";
  label: string;
  subtitle: string;
  visitedOn: string;
}

interface PopupLabels {
  openVisit: string;
}

const HOVER_CLOSE_DELAY = 250;
const MAP_PADDING = 44;
const POPUP_DETAIL_ROW_CLASS_NAME =
  "rounded-xl border border-sky-200/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(237,245,249,0.92))] px-3 py-2 shadow-[0_10px_20px_rgba(148,163,184,0.1),inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.76),rgba(2,6,23,0.58))] dark:shadow-[0_14px_24px_rgba(2,6,23,0.22),inset_0_1px_0_rgba(255,255,255,0.06)]";
const ROUTE_LINE_LAYER_ID = "public-trip-route-line";
const ROUTE_SOURCE_ID = "public-trip-route";

const createEndpointMarkerElement = (label: string) => {
  const marker = document.createElement("div");
  marker.className =
    "flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-sky-500 shadow-sm";
  marker.setAttribute("aria-hidden", "true");
  marker.title = label;
  return marker;
};

const createWaypointMarkerElement = (point: TripMapPoint) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-full border border-white/85 px-2 text-xs font-semibold text-white shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  button.classList.add(point.kind === "visit" ? "bg-emerald-600" : "bg-amber-500");
  button.setAttribute("aria-label", `${point.index}. ${point.label}`);
  button.textContent = String(point.index);
  return button;
};

const createPopupDetailRow = (text: string) => {
  const row = document.createElement("p");
  row.className = POPUP_DETAIL_ROW_CLASS_NAME;
  row.textContent = text;
  return row;
};

const createPopupNode = (point: TripMapPoint, labels: PopupLabels) => {
  const container = document.createElement("div");
  container.className = "max-w-[280px] p-3 text-foreground";

  const header = document.createElement("header");
  header.className = "flex items-start gap-3";

  const numberBadge = document.createElement("span");
  numberBadge.className =
    "inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-sky-200/70 bg-white/86 px-2 text-xs font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.56)] dark:border-sky-300/15 dark:bg-slate-950/60";
  numberBadge.textContent = String(point.index);

  const titleGroup = document.createElement("div");
  titleGroup.className = "min-w-0";

  const title = document.createElement("h3");
  title.className = "text-sm leading-tight font-semibold";
  title.textContent = point.label;

  const subtitle = document.createElement("p");
  subtitle.className = "mt-1 text-xs text-muted-foreground";
  subtitle.textContent = point.subtitle;

  titleGroup.append(title, subtitle);
  header.append(numberBadge, titleGroup);
  container.appendChild(header);

  const details = document.createElement("div");
  details.className = "mt-3 space-y-2 text-xs text-muted-foreground";
  details.appendChild(createPopupDetailRow(formatFinnishDate(point.visitedOn)));
  container.appendChild(details);

  if (point.href) {
    const actionRow = document.createElement("div");
    actionRow.className = "mt-3 flex justify-center";

    const link = document.createElement("a");
    link.href = point.href;
    link.className =
      "inline-flex items-center rounded-full border border-sky-200/70 bg-white/74 px-3 py-1.5 text-xs font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-colors hover:bg-white/92 dark:border-sky-300/15 dark:bg-slate-950/62 dark:hover:bg-slate-950/78";
    link.textContent = labels.openVisit;
    link.addEventListener("click", (event) => event.stopPropagation());

    actionRow.appendChild(link);
    container.appendChild(actionRow);
  }

  return container;
};

const getBoundsFromRoute = (route: PublicTripRoute): maplibregl.LngLatBoundsLike => {
  const lons = route.geometry.coordinates.map((point) => point[0]);
  const lats = route.geometry.coordinates.map((point) => point[1]);

  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
};

const getBoundsFromCoordinates = (
  coordinates: Array<{
    lat: number;
    lon: number;
  }>,
): maplibregl.LngLatBoundsLike => {
  const lons = coordinates.map((point) => point.lon);
  const lats = coordinates.map((point) => point.lat);

  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
};

export const PublicTripMap = ({
  route,
  startingPoint,
  tripName,
  tripStops,
}: PublicTripMapProps) => {
  const t = useTranslations("tripPage");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const popupRefs = useRef<maplibregl.Popup[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    const container = mapContainerRef.current;

    if (!container) {
      return;
    }

    const map = new maplibregl.Map({
      container,
      style: getMapStyle(),
      minZoom: 4,
      maxZoom: 15,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      setIsMapLoaded(true);
      map.resize();
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();

      for (const marker of markerRefs.current) {
        marker.remove();
      }

      markerRefs.current = [];

      for (const popup of popupRefs.current) {
        popup.remove();
      }

      popupRefs.current = [];
      map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapLoaded) {
      return;
    }

    if (route === null) {
      if (map.getLayer(ROUTE_LINE_LAYER_ID)) {
        map.removeLayer(ROUTE_LINE_LAYER_ID);
      }

      if (map.getSource(ROUTE_SOURCE_ID)) {
        map.removeSource(ROUTE_SOURCE_ID);
      }

      return;
    }

    const routeFeature = {
      type: "Feature" as const,
      properties: {},
      geometry: route.geometry,
    };

    const existingSource = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;

    if (existingSource) {
      existingSource.setData(routeFeature);
    } else {
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: routeFeature,
      });
    }

    if (!map.getLayer(ROUTE_LINE_LAYER_ID)) {
      map.addLayer({
        id: ROUTE_LINE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        paint: {
          "line-color": "hsl(158 64% 34%)",
          "line-opacity": 0.92,
          "line-width": 5,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });
    }

    return () => {
      if (map.getLayer(ROUTE_LINE_LAYER_ID)) {
        map.removeLayer(ROUTE_LINE_LAYER_ID);
      }

      if (map.getSource(ROUTE_SOURCE_ID)) {
        map.removeSource(ROUTE_SOURCE_ID);
      }
    };
  }, [isMapLoaded, route]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapLoaded) {
      return;
    }

    for (const marker of markerRefs.current) {
      marker.remove();
    }

    markerRefs.current = [];

    for (const popup of popupRefs.current) {
      popup.remove();
    }

    popupRefs.current = [];

    const tripPoints: TripMapPoint[] = tripStops.map((item) =>
      item.kind === "visit"
        ? {
            coordinate: item.visit.park.markerPoint,
            href: createParkVisitHref({
              parkSlug: item.visit.park.slug,
              visitId: item.visit.id,
            }),
            index: item.tripStopOrder,
            kind: "visit",
            label: item.visit.park.name,
            subtitle: item.visit.park.typeLabel,
            visitedOn: item.visit.visitedOn,
          }
        : {
            coordinate: item.stop.location.coordinate,
            index: item.tripStopOrder,
            kind: "stop",
            label: item.stop.location.displayName,
            subtitle: t("stopLabel"),
            visitedOn: item.stop.visitedOn,
          },
    );
    const pointBounds = getBoundsFromCoordinates([
      startingPoint.coordinate,
      ...tripPoints.map((point) => point.coordinate),
    ]);

    map.fitBounds(route ? getBoundsFromRoute(route) : pointBounds, {
      padding: MAP_PADDING,
      duration: 0,
    });

    const nextMarkers: maplibregl.Marker[] = [
      new maplibregl.Marker({
        element: createEndpointMarkerElement(t("startLabel")),
        anchor: "center",
      }).setLngLat([startingPoint.coordinate.lon, startingPoint.coordinate.lat]),
    ];
    let activePopup: maplibregl.Popup | null = null;
    let lockedPopup: maplibregl.Popup | null = null;
    let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null;

    const cancelClose = () => {
      if (hoverCloseTimer) {
        clearTimeout(hoverCloseTimer);
        hoverCloseTimer = null;
      }
    };

    const closeActivePopup = () => {
      cancelClose();
      activePopup?.remove();
      activePopup = null;
      lockedPopup = null;
    };

    const scheduleClose = () => {
      if (lockedPopup) {
        return;
      }

      cancelClose();
      hoverCloseTimer = setTimeout(() => {
        activePopup?.remove();
        activePopup = null;
        hoverCloseTimer = null;
      }, HOVER_CLOSE_DELAY);
    };

    const previewPopup = (popup: maplibregl.Popup) => {
      cancelClose();

      if (lockedPopup && lockedPopup !== popup) {
        return;
      }

      if (activePopup === popup) {
        return;
      }

      activePopup?.remove();
      popup.addTo(map);
      activePopup = popup;
    };

    const lockPopup = (popup: maplibregl.Popup) => {
      cancelClose();

      if (activePopup !== popup) {
        activePopup?.remove();
        popup.addTo(map);
        activePopup = popup;
      }

      lockedPopup = popup;
    };

    for (const point of tripPoints) {
      const element = createWaypointMarkerElement(point);
      const popupContent = createPopupNode(point, {
        openVisit: t("openVisit"),
      });
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: "240px",
        offset: 20,
      }).setLngLat([point.coordinate.lon, point.coordinate.lat]);
      popup.setDOMContent(popupContent);
      popupRefs.current.push(popup);

      popupContent.addEventListener("mouseenter", cancelClose);
      popupContent.addEventListener("mouseleave", scheduleClose);

      const handleMarkerClick = () => {
        if (lockedPopup === popup) {
          closeActivePopup();
          return;
        }

        if (activePopup === popup) {
          lockedPopup = popup;
          return;
        }

        lockPopup(popup);
      };

      element.addEventListener("click", handleMarkerClick);
      element.addEventListener("mouseenter", () => {
        previewPopup(popup);
      });
      element.addEventListener("mouseleave", () => {
        if (lockedPopup === popup) {
          return;
        }

        scheduleClose();
      });
      element.addEventListener("focus", () => {
        previewPopup(popup);
      });

      const marker = new maplibregl.Marker({
        element,
        anchor: "center",
      }).setLngLat([point.coordinate.lon, point.coordinate.lat]);

      nextMarkers.push(marker);
    }

    for (const marker of nextMarkers) {
      marker.addTo(map);
    }

    markerRefs.current = nextMarkers;

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (target.closest(".maplibregl-marker") || target.closest(".maplibregl-popup")) {
        return;
      }

      closeActivePopup();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeActivePopup();
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelClose();
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMapLoaded, route, startingPoint, t, tripStops]);

  return (
    <div
      ref={mapContainerRef}
      role="application"
      aria-label={t("mapAriaLabel", { trip: tripName })}
      className="h-104 w-full overflow-hidden rounded-[1.75rem] border border-white/35 bg-white/52 shadow-[0_18px_40px_rgba(148,163,184,0.16)] dark:border-white/10 dark:bg-slate-950/44 dark:shadow-[0_22px_48px_rgba(2,6,23,0.3)]"
    />
  );
};
