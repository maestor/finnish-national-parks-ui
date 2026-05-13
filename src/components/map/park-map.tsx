"use client";

import type { MapPark } from "@/lib/parks";
import { getVisitStatusColor } from "@/lib/parks";
import maplibregl from "maplibre-gl";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

interface ParkMapProps {
  parks: MapPark[];
  error?: string | null;
}

const FINLAND_CENTER: [number, number] = [26.0, 65.0];
const FINLAND_ZOOM = 4.5;
const HOVER_CLOSE_DELAY = 300;

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
  button.type = "button";
  button.className =
    "group relative flex items-center justify-center w-8 h-8 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full";
  button.setAttribute("aria-label", `${park.name}, ${park.type.name}`);
  button.dataset.slug = park.slug;

  const color = getVisitStatusColor(park);

  button.innerHTML = `
    <svg viewBox="0 0 24 24" fill="${color}" class="w-6 h-6 drop-shadow-md transition-transform group-hover:scale-110" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;

  return button;
};

interface PopupLabels {
  established: string;
  officialLink: string;
}

const createPopupNode = (park: MapPark, labels: PopupLabels): HTMLElement => {
  const container = document.createElement("div");
  container.className = "p-3 max-w-[260px]";

  const color = getVisitStatusColor(park);

  const header = document.createElement("header");
  header.className = "flex items-start gap-2";

  const pinIcon = document.createElement("span");
  pinIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;

  const title = document.createElement("h3");
  title.className = "font-semibold text-sm leading-tight";
  title.textContent = park.name;

  header.appendChild(pinIcon);
  header.appendChild(title);
  container.appendChild(header);

  const details = document.createElement("div");
  details.className = "mt-2 space-y-1 text-xs text-muted-foreground";

  const typeRow = document.createElement("p");
  typeRow.className = "flex items-center gap-1.5";
  typeRow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 shrink-0" aria-hidden="true"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg><span>${park.type.name}</span>`;
  details.appendChild(typeRow);

  if (park.locationLabel) {
    const loc = document.createElement("p");
    loc.className = "truncate";
    loc.textContent = park.locationLabel;
    loc.title = park.locationLabel;
    details.appendChild(loc);
  }

  if (park.areaKm2 !== null) {
    const area = document.createElement("p");
    area.textContent = `${park.areaKm2} km²`;
    details.appendChild(area);
  }

  if (park.establishmentYear !== null) {
    const year = document.createElement("p");
    year.textContent = `${labels.established} ${park.establishmentYear}`;
    details.appendChild(year);
  }

  container.appendChild(details);

  if (park.luontoonUrl) {
    const link = document.createElement("a");
    link.href = park.luontoonUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className =
      "mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline";
    link.innerHTML = `${labels.officialLink}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`;
    link.addEventListener("click", (e) => e.stopPropagation());
    container.appendChild(link);
  }

  return container;
};

export const ParkMap = ({ parks, error }: ParkMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupsRef = useRef<Map<string, maplibregl.Popup>>(new Map());
  const shownPopupsRef = useRef<Set<string>>(new Set());
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useTranslations("map");
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

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

  // Initialize map
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: getMapStyle(),
      center: FINLAND_CENTER,
      zoom: FINLAND_ZOOM,
      minZoom: 3,
      maxZoom: 16,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      setIsMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      cancelClose();
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
        .setDOMContent(createPopupNode(park, labels));

      popupsRef.current.set(park.slug, popup);

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([park.markerPoint.lon, park.markerPoint.lat])
        .addTo(map);

      markersRef.current.push(marker);

      // Pin interactions
      el.addEventListener("click", () => {
        cancelClose();
        setHoveredSlug(null);
        setActiveSlug((current) => (current === park.slug ? current : park.slug));
      });

      el.addEventListener("mouseenter", () => {
        cancelClose();
        setActiveSlug(park.slug);
        setHoveredSlug(park.slug);
      });

      el.addEventListener("mouseleave", () => {
        scheduleClose();
      });

      el.addEventListener("focus", () => {
        cancelClose();
        setHoveredSlug(null);
        setActiveSlug(park.slug);
      });

      el.addEventListener("blur", () => {
        setActiveSlug(null);
      });
    }
  }, [parks, isMapLoaded, t, cancelClose, scheduleClose]);

  // Sync popup visibility with active/hovered state
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const [slug, popup] of popupsRef.current) {
      const shouldShow = activeSlug === slug || hoveredSlug === slug;
      const isShown = shownPopupsRef.current.has(slug);

      if (shouldShow && !isShown) {
        popup.addTo(map);
        shownPopupsRef.current.add(slug);

        const content = popup.getElement();
        const wrapper = content?.parentElement;
        if (wrapper) {
          wrapper.addEventListener("mouseenter", cancelClose);
          wrapper.addEventListener("mouseleave", scheduleClose);
        }
      } else if (!shouldShow && isShown) {
        popup.remove();
        shownPopupsRef.current.delete(slug);
      }
    }
  }, [activeSlug, hoveredSlug, cancelClose, scheduleClose]);

  // Click outside to close active popup
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInsideMarker = !!target.closest(".maplibregl-marker");
      const isInsidePopup = !!target.closest(".maplibregl-popup");

      if (!isInsideMarker && !isInsidePopup) {
        setActiveSlug(null);
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
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">{t("loading")}</span>
          </div>
        </div>
      )}
    </div>
  );
};
