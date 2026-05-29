"use client";

import type { MapPark } from "@/lib/parks";
import { getParkTypeDisplayName, getVisitStatusColor } from "@/lib/parks";
import maplibregl from "maplibre-gl";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type HomeParkFocusRequest,
  useHomeMapControls,
} from "../providers/home-map-controls-provider";
import { ThreeDotPulse } from "../ui/three-dot-pulse";
import "maplibre-gl/dist/maplibre-gl.css";

interface ParkMapProps {
  parks: MapPark[];
  error?: string | null;
  canManageVisits?: boolean;
  homeParkFocusRequest?: HomeParkFocusRequest | null;
  resetViewRequestId?: number;
  onActiveSlugChange?: (slug: string | null) => void;
}

const FINLAND_BOUNDS: maplibregl.LngLatBoundsLike = [
  [19.0, 59.5],
  [32.0, 70.5],
];
const MAP_PADDING = 24;
const HOVER_CLOSE_DELAY = 300;
const PARK_FOCUS_PADDING = {
  top: 104,
  right: 48,
  bottom: 48,
  left: 48,
} as const;

const getBoundsForVisibleParks = (parks: MapPark[]): maplibregl.LngLatBoundsLike => {
  if (parks.length === 0) {
    return FINLAND_BOUNDS;
  }

  const combinedBounds = parks.reduce(
    (currentBounds, park) => ({
      minLon: Math.min(currentBounds.minLon, park.boundingBox.minLon),
      minLat: Math.min(currentBounds.minLat, park.boundingBox.minLat),
      maxLon: Math.max(currentBounds.maxLon, park.boundingBox.maxLon),
      maxLat: Math.max(currentBounds.maxLat, park.boundingBox.maxLat),
    }),
    {
      minLon: parks[0].boundingBox.minLon,
      minLat: parks[0].boundingBox.minLat,
      maxLon: parks[0].boundingBox.maxLon,
      maxLat: parks[0].boundingBox.maxLat,
    },
  );

  return [
    [combinedBounds.minLon, combinedBounds.minLat],
    [combinedBounds.maxLon, combinedBounds.maxLat],
  ];
};

const getMapStyle = () => {
  const mapStyleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL as string | undefined;
  if (mapStyleUrl) {
    return mapStyleUrl;
  }
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  } as maplibregl.StyleSpecification;
};

const createMarkerElement = (park: MapPark) => {
  const button = document.createElement("button");
  const displayTypeName = getParkTypeDisplayName(park);
  button.type = "button";
  button.className =
    "group relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  button.setAttribute("aria-label", `${park.name}, ${displayTypeName}`);
  button.dataset.slug = park.slug;

  const color = getVisitStatusColor(park);

  button.innerHTML = `
    <svg viewBox="0 0 24 24" fill="${color}" class="h-6 w-6 drop-shadow-md transition-transform group-hover:scale-110" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;

  return button;
};

interface PopupLabels {
  established: string;
  officialLink: string;
  pdfBrochure: string;
  visits: string;
  openParkPage: string;
  addVisit: string;
}

const createPopupNode = (
  park: MapPark,
  labels: PopupLabels,
  canManageVisits: boolean,
): HTMLElement => {
  const container = document.createElement("div");
  const displayTypeName = getParkTypeDisplayName(park);
  container.className = "max-w-[280px] p-3 text-foreground";

  const color = getVisitStatusColor(park);

  if (park.logo?.url) {
    const logoWrapper = document.createElement("div");
    logoWrapper.className = "flex justify-center";

    const logoImg = document.createElement("img");
    logoImg.src = park.logo.url;
    logoImg.alt = park.name;
    logoImg.className = "h-12 w-auto";

    logoWrapper.appendChild(logoImg);
    container.appendChild(logoWrapper);
  }

  const header = document.createElement("header");
  header.className = "flex items-start gap-3";

  const pinIcon = document.createElement("span");
  pinIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;

  const title = document.createElement("h3");
  title.className = "text-sm leading-tight font-semibold";
  title.textContent = park.name;

  header.appendChild(pinIcon);
  header.appendChild(title);
  container.appendChild(header);

  const details = document.createElement("div");
  details.className = "mt-3 space-y-2 text-xs text-muted-foreground";

  const typeRow = document.createElement("p");
  typeRow.className =
    "flex items-center gap-1.5 rounded-xl border border-sky-200/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(237,245,249,0.92))] px-3 py-2 shadow-[0_10px_20px_rgba(148,163,184,0.1),inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.76),rgba(2,6,23,0.58))] dark:shadow-[0_14px_24px_rgba(2,6,23,0.22),inset_0_1px_0_rgba(255,255,255,0.06)]";
  typeRow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 shrink-0" aria-hidden="true"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg><span>${displayTypeName}</span>`;
  details.appendChild(typeRow);

  if (park.location) {
    const loc = document.createElement("p");
    loc.className =
      "truncate rounded-xl border border-sky-200/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(237,245,249,0.92))] px-3 py-2 shadow-[0_10px_20px_rgba(148,163,184,0.1),inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.76),rgba(2,6,23,0.58))] dark:shadow-[0_14px_24px_rgba(2,6,23,0.22),inset_0_1px_0_rgba(255,255,255,0.06)]";
    loc.textContent = park.location;
    loc.title = park.location;
    details.appendChild(loc);
  }

  const hasArea = park.areaKm2 !== null;
  const hasYear = park.establishmentYear !== null;

  if (hasArea || hasYear) {
    const metaRow = document.createElement("p");
    metaRow.className =
      "rounded-xl border border-sky-200/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(237,245,249,0.92))] px-3 py-2 shadow-[0_10px_20px_rgba(148,163,184,0.1),inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.76),rgba(2,6,23,0.58))] dark:shadow-[0_14px_24px_rgba(2,6,23,0.22),inset_0_1px_0_rgba(255,255,255,0.06)]";

    const parts: string[] = [];
    if (hasYear) {
      parts.push(`${labels.established} ${park.establishmentYear}`);
    }
    if (hasArea) {
      parts.push(`${park.areaKm2} km²`);
    }

    metaRow.textContent = parts.join(" • ");
    details.appendChild(metaRow);
  }

  if (park.luontoonUrl || park.map?.url) {
    const linksRow = document.createElement("div");
    linksRow.className = "flex flex-wrap items-center justify-between gap-2";

    if (park.luontoonUrl) {
      const officialLink = document.createElement("a");
      officialLink.href = park.luontoonUrl;
      officialLink.target = "_blank";
      officialLink.rel = "noopener noreferrer";
      officialLink.className =
        "inline-flex items-center gap-1 rounded-full border border-sky-200/70 bg-white/74 px-3 py-1.5 font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-colors hover:bg-white/92 dark:border-sky-300/15 dark:bg-slate-950/62 dark:hover:bg-slate-950/78";
      officialLink.innerHTML = `${labels.officialLink}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`;
      officialLink.addEventListener("click", (e) => e.stopPropagation());
      linksRow.appendChild(officialLink);
    }

    if (park.map?.url) {
      const pdfLink = document.createElement("a");
      pdfLink.href = park.map.url;
      pdfLink.target = "_blank";
      pdfLink.rel = "noopener noreferrer";
      pdfLink.className =
        "inline-flex items-center gap-1 rounded-full border border-sky-200/70 bg-white/74 px-3 py-1.5 font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-colors hover:bg-white/92 dark:border-sky-300/15 dark:bg-slate-950/62 dark:hover:bg-slate-950/78";
      pdfLink.innerHTML = `${labels.pdfBrochure}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>`;
      pdfLink.addEventListener("click", (e) => e.stopPropagation());
      linksRow.appendChild(pdfLink);
    }

    details.appendChild(linksRow);
  }

  container.appendChild(details);

  const summaryRow = document.createElement("div");
  summaryRow.className =
    "mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/35 pt-3 text-xs dark:border-white/10";

  const visitCount = park.visitedSummary.visitCount;
  const visitsCount = document.createElement("span");
  visitsCount.className =
    "inline-flex items-center rounded-full border border-white/45 bg-white/72 px-3 py-1 font-medium text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/10 dark:bg-slate-950/56 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";
  visitsCount.textContent = `${labels.visits} (${visitCount})`;
  summaryRow.appendChild(visitsCount);

  const parkLink = document.createElement("a");
  parkLink.href = `/park/${park.slug}`;
  parkLink.className =
    "inline-flex items-center rounded-full border border-sky-200/70 bg-white/74 px-3 py-1.5 font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-colors hover:bg-white/92 dark:border-sky-300/15 dark:bg-slate-950/62 dark:hover:bg-slate-950/78";
  parkLink.textContent = labels.openParkPage;
  parkLink.addEventListener("click", (e) => e.stopPropagation());
  summaryRow.appendChild(parkLink);
  container.appendChild(summaryRow);

  const actionRow = document.createElement("div");
  actionRow.className = "mt-3 flex items-center gap-2 text-xs";

  if (canManageVisits) {
    const addLink = document.createElement("a");
    addLink.href = `/control-panel/visits/new?park=${park.slug}`;
    addLink.className =
      "inline-flex items-center gap-1 rounded-full border border-emerald-200/70 bg-white/74 px-3 py-1.5 font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-colors hover:bg-white/92 dark:border-emerald-300/15 dark:bg-slate-950/62 dark:hover:bg-slate-950/78";
    addLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg><span>${labels.addVisit}</span>`;
    addLink.addEventListener("click", (e) => e.stopPropagation());
    actionRow.appendChild(addLink);
  }

  if (canManageVisits) {
    container.appendChild(actionRow);
  }

  return container;
};

export const ParkMap = ({
  parks,
  error,
  canManageVisits = false,
  homeParkFocusRequest = null,
  resetViewRequestId = 0,
  onActiveSlugChange,
}: ParkMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupsRef = useRef<Map<string, maplibregl.Popup>>(new Map());
  const shownPopupsRef = useRef<Set<string>>(new Set());
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSlugRef = useRef<string | null>(null);
  const hoveredSlugRef = useRef<string | null>(null);
  const lastHandledHomeFocusRequestIdRef = useRef(0);
  const lastHandledResetViewRequestIdRef = useRef(0);
  const t = useTranslations("map");
  const { clearHomeParkFocusRequest } = useHomeMapControls();
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  useEffect(() => {
    activeSlugRef.current = activeSlug;
    onActiveSlugChange?.(activeSlug);
  }, [activeSlug, onActiveSlugChange]);

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

  const focusPark = useCallback(
    (park: MapPark) => {
      cancelClose();
      setHoveredSlug(null);
      setActiveSlug(park.slug);

      const map = mapRef.current;
      if (!map) {
        return;
      }

      map.fitBounds(
        [
          [park.boundingBox.minLon, park.boundingBox.minLat],
          [park.boundingBox.maxLon, park.boundingBox.maxLat],
        ],
        {
          duration: 1200,
          maxZoom: 11,
          padding: PARK_FOCUS_PADDING,
        },
      );
    },
    [cancelClose],
  );

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

  // Initialize map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: getMapStyle(),
      bounds: FINLAND_BOUNDS,
      fitBoundsOptions: {
        duration: 0,
        padding: MAP_PADDING,
      },
      minZoom: 3,
      maxZoom: 16,
      maxBounds: [
        [0.0, 51.0],
        [60.0, 71.0],
      ],
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      setIsMapLoaded(true);
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    return () => {
      cancelClose();
      resizeObserver.disconnect();
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
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

  // Create markers and popups when parks or map load state changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    // Clear existing markers and popups
    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];
    for (const popup of popupsRef.current.values()) {
      popup.remove();
    }
    popupsRef.current.clear();
    shownPopupsRef.current.clear();

    if (parks.length === 0) return;

    const labels: PopupLabels = {
      established: t("established"),
      officialLink: t("officialLink"),
      pdfBrochure: t("pdfBrochure"),
      visits: t("visits"),
      openParkPage: t("openParkPage"),
      addVisit: t("addVisit"),
    };

    for (const park of parks) {
      const el = createMarkerElement(park);

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: "280px",
        offset: {
          center: [0, 12],
          top: [0, 0],
          bottom: [0, -30],
          left: [16, -16],
          right: [-16, -16],
          "top-left": [0, 0],
          "top-right": [0, 0],
          "bottom-left": [0, -32],
          "bottom-right": [0, -32],
        },
      })
        .setLngLat([park.markerPoint.lon, park.markerPoint.lat])
        .setDOMContent(createPopupNode(park, labels, canManageVisits));

      popupsRef.current.set(park.slug, popup);

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([park.markerPoint.lon, park.markerPoint.lat])
        .addTo(map);

      markersRef.current.push(marker);

      // Pin interactions
      el.addEventListener("click", () => {
        if (activeSlugRef.current === park.slug) {
          cancelClose();
          setHoveredSlug(null);
          setActiveSlug(null);
          return;
        }

        focusPark(park);
      });

      el.addEventListener("mouseenter", () => {
        if (activeSlugRef.current && activeSlugRef.current !== park.slug) {
          return;
        }

        cancelClose();
        setHoveredSlug(park.slug);
      });

      el.addEventListener("mouseleave", () => {
        scheduleClose();
      });

      el.addEventListener("focus", () => {
        focusPark(park);
      });

      el.addEventListener("blur", () => {
        closeActivePopupIfFocusLeftMapPopup(park.slug);
      });
    }

    syncPopupVisibility(activeSlugRef.current, hoveredSlugRef.current);
  }, [
    parks,
    isMapLoaded,
    t,
    cancelClose,
    scheduleClose,
    canManageVisits,
    closeActivePopupIfFocusLeftMapPopup,
    focusPark,
    syncPopupVisibility,
  ]);

  useEffect(() => {
    if (!isMapLoaded || !homeParkFocusRequest) {
      return;
    }

    if (lastHandledHomeFocusRequestIdRef.current === homeParkFocusRequest.requestId) {
      return;
    }

    const park = parks.find(({ slug }) => slug === homeParkFocusRequest.slug);
    if (!park) {
      return;
    }

    lastHandledHomeFocusRequestIdRef.current = homeParkFocusRequest.requestId;
    focusPark(park);
  }, [focusPark, homeParkFocusRequest, isMapLoaded, parks]);

  useEffect(() => {
    if (!homeParkFocusRequest || activeSlug !== homeParkFocusRequest.slug) {
      return;
    }

    const cleanupTimeoutId = window.setTimeout(() => {
      clearHomeParkFocusRequest();
    }, 0);

    return () => {
      window.clearTimeout(cleanupTimeoutId);
    };
  }, [activeSlug, clearHomeParkFocusRequest, homeParkFocusRequest]);

  useEffect(() => {
    if (!isMapLoaded || resetViewRequestId <= 0) {
      return;
    }

    if (lastHandledResetViewRequestIdRef.current === resetViewRequestId) {
      return;
    }

    lastHandledResetViewRequestIdRef.current = resetViewRequestId;
    setActiveSlug(null);
    setHoveredSlug(null);
    cancelClose();
    mapRef.current?.fitBounds(getBoundsForVisibleParks(parks), {
      duration: 800,
      maxZoom: parks.length > 0 ? 11 : undefined,
      padding: parks.length > 0 ? PARK_FOCUS_PADDING : MAP_PADDING,
    });
  }, [cancelClose, isMapLoaded, parks, resetViewRequestId]);

  // Sync popup visibility with active/hovered state
  useEffect(() => {
    syncPopupVisibility(activeSlug, hoveredSlug);
  }, [activeSlug, hoveredSlug, syncPopupVisibility]);

  // Click outside to close active popup
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
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

  // Escape to close active popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveSlug(null);
        setHoveredSlug(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <p className="text-destructive font-medium">{t("loadError")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 min-h-0">
      <div
        ref={mapContainerRef}
        className="flex-1"
        role="application"
        aria-label={t("ariaLabel")}
      />
      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="flex flex-col items-center gap-2">
            <ThreeDotPulse size="lg" />
            <span className="text-sm text-muted-foreground">{t("loading")}</span>
          </div>
        </div>
      )}
    </div>
  );
};
