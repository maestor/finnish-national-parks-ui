"use client";

import maplibregl from "maplibre-gl";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { getParkTypeDisplayName } from "@/lib/parks";
import { appRoutes } from "@/lib/routes";
import type {
  TripPlannerResolvedLocation,
  TripPlannerRouteResult,
  TripPlannerSearchAreaResult,
  TripPlannerUiParkResult,
} from "@/lib/trip-planner";
import { getMapStyle } from "../map/map-style";
import { ThreeDotPulse } from "../ui/three-dot-pulse";
import "maplibre-gl/dist/maplibre-gl.css";

interface TripPlannerMapProps {
  destination: TripPlannerResolvedLocation | null;
  distanceLabel: string;
  mode: "nearby" | "route";
  origin: TripPlannerResolvedLocation;
  parks: TripPlannerUiParkResult[];
  route: TripPlannerRouteResult | null;
  searchArea: TripPlannerSearchAreaResult | null;
  visibleDistanceKm?: number;
}

interface PopupLabels {
  distance: string;
  openParkPage: string;
}

const DISTANCE_FORMATTER = new Intl.NumberFormat("fi-FI", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});
const HOVER_CLOSE_DELAY = 250;
const MAP_PADDING = 44;
const ROUTE_LINE_LAYER_ID = "trip-planner-route-line";
const ROUTE_SOURCE_ID = "trip-planner-route";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const EARTH_RADIUS_KM = 6371;
const POPUP_DETAIL_ROW_CLASS_NAME =
  "rounded-xl border border-sky-200/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(237,245,249,0.92))] px-3 py-2 shadow-[0_10px_20px_rgba(148,163,184,0.1),inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.76),rgba(2,6,23,0.58))] dark:shadow-[0_14px_24px_rgba(2,6,23,0.22),inset_0_1px_0_rgba(255,255,255,0.06)]";

const getVisibleBounds = (
  baseBoundingBox:
    | TripPlannerRouteResult["boundingBox"]
    | TripPlannerSearchAreaResult["boundingBox"],
  parks: TripPlannerUiParkResult[],
): maplibregl.LngLatBoundsLike => {
  const combinedBounds = parks.reduce(
    (currentBounds, park) => ({
      minLon: Math.min(currentBounds.minLon, park.boundingBox.minLon),
      minLat: Math.min(currentBounds.minLat, park.boundingBox.minLat),
      maxLon: Math.max(currentBounds.maxLon, park.boundingBox.maxLon),
      maxLat: Math.max(currentBounds.maxLat, park.boundingBox.maxLat),
    }),
    {
      minLon: baseBoundingBox.minLon,
      minLat: baseBoundingBox.minLat,
      maxLon: baseBoundingBox.maxLon,
      maxLat: baseBoundingBox.maxLat,
    },
  );

  return [
    [combinedBounds.minLon, combinedBounds.minLat],
    [combinedBounds.maxLon, combinedBounds.maxLat],
  ];
};

const getBoundingBoxForDistanceKm = (
  center: TripPlannerResolvedLocation["coordinate"],
  distanceKm: number,
): TripPlannerSearchAreaResult["boundingBox"] => {
  const latitudeOffsetDegrees = (distanceKm / EARTH_RADIUS_KM) * (180 / Math.PI);
  const longitudeOffsetDegrees =
    latitudeOffsetDegrees / Math.max(Math.cos((center.lat * Math.PI) / 180), 0.000001);

  return {
    minLat: center.lat - latitudeOffsetDegrees,
    minLon: center.lon - longitudeOffsetDegrees,
    maxLat: center.lat + latitudeOffsetDegrees,
    maxLon: center.lon + longitudeOffsetDegrees,
  };
};

const getBaseBoundingBox = ({
  origin,
  route,
  searchArea,
  visibleDistanceKm,
}: {
  origin: TripPlannerResolvedLocation;
  route: TripPlannerRouteResult | null;
  searchArea: TripPlannerSearchAreaResult | null;
  visibleDistanceKm?: number;
}) => {
  if (route) {
    return route.boundingBox;
  }

  if (!searchArea) {
    return {
      minLat: origin.coordinate.lat,
      minLon: origin.coordinate.lon,
      maxLat: origin.coordinate.lat,
      maxLon: origin.coordinate.lon,
    };
  }

  if (
    visibleDistanceKm === undefined ||
    visibleDistanceKm >= searchArea.maxDistanceKm ||
    visibleDistanceKm <= 0
  ) {
    return searchArea.boundingBox;
  }

  return getBoundingBoxForDistanceKm(searchArea.center, visibleDistanceKm);
};

const createSvgPin = (fill: string, className = "pointer-events-none h-7 w-7 drop-shadow-md") => {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", fill);
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("xmlns", SVG_NAMESPACE);

  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute(
    "d",
    "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z",
  );
  svg.appendChild(path);

  return svg;
};

const createStrokeIcon = (pathDefinition: string) => {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("class", "h-3.5 w-3.5 shrink-0");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("xmlns", SVG_NAMESPACE);

  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute("d", pathDefinition);
  svg.appendChild(path);

  return svg;
};

const createEndpointMarkerElement = (label: string, toneClassName: string) => {
  const marker = document.createElement("div");
  marker.className =
    "flex h-4 w-4 items-center justify-center rounded-full border-2 border-white shadow-sm";
  marker.classList.add(toneClassName);
  marker.setAttribute("aria-hidden", "true");
  marker.title = label;
  return marker;
};

const createParkMarkerElement = (park: TripPlannerUiParkResult) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "group flex h-8 w-8 cursor-pointer items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  button.setAttribute("aria-label", `${park.name}, ${getParkTypeDisplayName(park)}`);
  button.appendChild(createSvgPin(park.visitedSummary.visited ? "#16a34a" : "#64748b"));
  return button;
};

const createPopupNode = (park: TripPlannerUiParkResult, labels: PopupLabels) => {
  const container = document.createElement("div");
  container.className = "max-w-[280px] p-3 text-foreground";

  const header = document.createElement("header");
  header.className = "flex items-start gap-3";

  const pinIcon = document.createElement("span");
  pinIcon.appendChild(
    createSvgPin(park.visitedSummary.visited ? "#16a34a" : "#64748b", "mt-0.5 h-4 w-4 shrink-0"),
  );

  const title = document.createElement("h3");
  title.className = "text-sm leading-tight font-semibold";

  const titleLink = document.createElement("a");
  titleLink.href = appRoutes.park(park.slug);
  titleLink.className =
    "text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  titleLink.textContent = park.name;
  titleLink.addEventListener("click", (event) => event.stopPropagation());
  title.appendChild(titleLink);
  header.append(pinIcon, title);
  container.appendChild(header);

  const details = document.createElement("div");
  details.className = "mt-3 space-y-2 text-xs text-muted-foreground";

  const typeRow = document.createElement("p");
  typeRow.className = `flex items-center gap-1.5 ${POPUP_DETAIL_ROW_CLASS_NAME}`;
  typeRow.appendChild(createStrokeIcon("m8 3 4 8 5-5 5 15H2L8 3z"));
  const typeText = document.createElement("span");
  typeText.textContent = getParkTypeDisplayName(park);
  typeRow.appendChild(typeText);
  details.appendChild(typeRow);

  const addressRow = document.createElement("p");
  addressRow.className = `truncate ${POPUP_DETAIL_ROW_CLASS_NAME}`;
  addressRow.textContent = park.address;
  addressRow.title = park.address;
  details.appendChild(addressRow);

  const distanceRow = document.createElement("p");
  distanceRow.className = POPUP_DETAIL_ROW_CLASS_NAME;
  distanceRow.textContent = `${labels.distance} ${DISTANCE_FORMATTER.format(park.distanceKm)} km`;
  details.appendChild(distanceRow);

  container.appendChild(details);

  const actionLink = document.createElement("a");
  actionLink.href = appRoutes.park(park.slug);
  actionLink.className =
    "inline-flex items-center self-center rounded-full border border-sky-200/70 bg-white/74 px-3 py-1.5 text-xs font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-colors hover:bg-white/92 dark:border-sky-300/15 dark:bg-slate-950/62 dark:hover:bg-slate-950/78";
  actionLink.textContent = labels.openParkPage;
  actionLink.addEventListener("click", (event) => event.stopPropagation());
  const actionRow = document.createElement("div");
  actionRow.className = "mt-3 flex justify-center";
  actionRow.appendChild(actionLink);
  container.appendChild(actionRow);

  return container;
};

export const TripPlannerMap = ({
  destination,
  distanceLabel,
  mode,
  origin,
  parks,
  route,
  searchArea,
  visibleDistanceKm,
}: TripPlannerMapProps) => {
  const t = useTranslations("tripPlanner");
  const mapT = useTranslations("map");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const popupsRef = useRef<Map<string, maplibregl.Popup>>(new Map());
  const shownPopupsRef = useRef<Set<string>>(new Set());
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSlugRef = useRef<string | null>(null);
  const hoveredSlugRef = useRef<string | null>(null);
  const destroyedRef = useRef(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    activeSlugRef.current = activeSlug;
  }, [activeSlug]);

  useEffect(() => {
    hoveredSlugRef.current = hoveredSlug;
  }, [hoveredSlug]);

  useEffect(() => {
    const visibleSlugs = new Set(parks.map((park) => park.slug));

    if (activeSlug && !visibleSlugs.has(activeSlug)) {
      setActiveSlug(null);
    }

    if (hoveredSlug && !visibleSlugs.has(hoveredSlug)) {
      setHoveredSlug(null);
    }
  }, [activeSlug, hoveredSlug, parks]);

  const cancelClose = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    hoverTimerRef.current = setTimeout(() => {
      setHoveredSlug(null);
    }, HOVER_CLOSE_DELAY);
  }, []);

  const closeActivePopupIfFocusLeftMapPopup = useCallback((slug: string) => {
    window.setTimeout(() => {
      const focusedElement = document.activeElement;
      if (!(focusedElement instanceof HTMLElement)) {
        setActiveSlug((current) => (current === slug ? null : current));
        return;
      }

      const isInsideMarker = !!focusedElement.closest(".maplibregl-marker");
      const isInsidePopup = !!focusedElement.closest(".maplibregl-popup");

      if (!isInsideMarker && !isInsidePopup) {
        setActiveSlug((current) => (current === slug ? null : current));
      }
    }, 0);
  }, []);

  const syncPopupVisibility = useCallback(
    (currentActiveSlug: string | null, currentHoveredSlug: string | null) => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      for (const [slug, popup] of popupsRef.current) {
        const shouldShow =
          currentActiveSlug === slug || (currentActiveSlug === null && currentHoveredSlug === slug);
        const isShown = shownPopupsRef.current.has(slug);

        if (shouldShow && !isShown) {
          popup.addTo(map);
          shownPopupsRef.current.add(slug);
        } else if (!shouldShow && isShown) {
          popup.remove();
          shownPopupsRef.current.delete(slug);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) {
      return;
    }

    destroyedRef.current = false;

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
      destroyedRef.current = true;
      cancelClose();
      resizeObserver.disconnect();

      for (const marker of markerRefs.current) {
        marker.remove();
      }
      markerRefs.current = [];

      for (const popup of popupsRef.current.values()) {
        popup.remove();
      }
      popupsRef.current.clear();
      shownPopupsRef.current.clear();

      map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, [cancelClose]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) {
      return;
    }

    if (route) {
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
            "line-color": "hsl(142 76% 36%)",
            "line-opacity": 0.9,
            "line-width": 5,
          },
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
        });
      }
    } else {
      if (map.getLayer(ROUTE_LINE_LAYER_ID)) {
        map.removeLayer(ROUTE_LINE_LAYER_ID);
      }

      if (map.getSource(ROUTE_SOURCE_ID)) {
        map.removeSource(ROUTE_SOURCE_ID);
      }
    }

    return () => {
      if (destroyedRef.current) {
        return;
      }

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

    for (const popup of popupsRef.current.values()) {
      popup.remove();
    }
    popupsRef.current.clear();
    shownPopupsRef.current.clear();

    const nextMarkers = [
      new maplibregl.Marker({
        element: createEndpointMarkerElement(origin.label, "bg-sky-500"),
        anchor: "center",
      }).setLngLat([origin.coordinate.lon, origin.coordinate.lat]),
    ];

    if (destination) {
      nextMarkers.push(
        new maplibregl.Marker({
          element: createEndpointMarkerElement(destination.label, "bg-emerald-600"),
          anchor: "center",
        }).setLngLat([destination.coordinate.lon, destination.coordinate.lat]),
      );
    }

    const popupLabels: PopupLabels = {
      distance: distanceLabel,
      openParkPage: mapT("openParkPage"),
    };

    for (const park of parks) {
      const element = createParkMarkerElement(park);
      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: "280px",
        offset: {
          bottom: [0, -30],
          center: [0, 12],
          left: [16, -16],
          right: [-16, -16],
          top: [0, 0],
          "bottom-left": [0, -32],
          "bottom-right": [0, -32],
          "top-left": [0, 0],
          "top-right": [0, 0],
        },
      })
        .setLngLat([park.markerPoint.lon, park.markerPoint.lat])
        .setDOMContent(createPopupNode(park, popupLabels));

      popupsRef.current.set(park.slug, popup);

      const marker = new maplibregl.Marker({
        element,
        anchor: "bottom",
      }).setLngLat([park.markerPoint.lon, park.markerPoint.lat]);

      nextMarkers.push(marker);

      element.addEventListener("click", () => {
        cancelClose();
        setHoveredSlug(null);

        if (activeSlugRef.current === park.slug) {
          setActiveSlug(null);
          return;
        }

        setActiveSlug(park.slug);
      });

      element.addEventListener("mouseenter", () => {
        if (activeSlugRef.current && activeSlugRef.current !== park.slug) {
          return;
        }

        cancelClose();
        setHoveredSlug(park.slug);
      });

      element.addEventListener("mouseleave", () => {
        scheduleClose();
      });

      element.addEventListener("focus", () => {
        cancelClose();
        setHoveredSlug(null);
        setActiveSlug(park.slug);
      });

      element.addEventListener("blur", () => {
        closeActivePopupIfFocusLeftMapPopup(park.slug);
      });
    }

    for (const marker of nextMarkers) {
      marker.addTo(map);
    }

    markerRefs.current = nextMarkers;
    map.fitBounds(
      getVisibleBounds(getBaseBoundingBox({ origin, route, searchArea, visibleDistanceKm }), parks),
      {
        padding: MAP_PADDING,
        duration: 0,
      },
    );
    syncPopupVisibility(activeSlugRef.current, hoveredSlugRef.current);
  }, [
    cancelClose,
    closeActivePopupIfFocusLeftMapPopup,
    destination,
    distanceLabel,
    isMapLoaded,
    mapT,
    origin,
    parks,
    route,
    searchArea,
    scheduleClose,
    syncPopupVisibility,
    visibleDistanceKm,
  ]);

  useEffect(() => {
    syncPopupVisibility(activeSlug, hoveredSlug);
  }, [activeSlug, hoveredSlug, syncPopupVisibility]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isInsideMarker = !!target.closest(".maplibregl-marker");
      const isInsidePopup = !!target.closest(".maplibregl-popup");
      const mapContainer = mapContainerRef.current;

      if (isInsideMarker || isInsidePopup) {
        return;
      }

      if (mapContainer?.contains(target)) {
        setActiveSlug(null);
        setHoveredSlug(null);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveSlug(null);
        setHoveredSlug(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-[1.45rem] border border-white/45 bg-white/66 dark:border-white/10 dark:bg-slate-950/44"
      style={{ height: 500 }}
    >
      <div
        ref={mapContainerRef}
        className="h-full w-full"
        role="application"
        aria-label={mode === "route" ? t("map.ariaLabel") : t("map.ariaLabelNearby")}
      />

      {!isMapLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background/65 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <ThreeDotPulse size="lg" />
            <span className="text-sm text-muted-foreground">
              {mode === "route" ? t("map.loading") : t("map.loadingNearby")}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
