"use client";

import * as maplibregl from "maplibre-gl";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PUBLIC_EMPTY_STATE_PANEL_CLASS_NAME,
  PUBLIC_PANEL_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { createParkVisitHref, type PublicVisitsMapMarker } from "@/lib/public-visits";
import { createMapPinSvg } from "../map/map-pin";
import {
  bindMapPointLayerEvents,
  MAP_POINT_LAYER_ID,
  prepareMapPointIcon,
  setMapPopupInteractivity,
  syncMapPointLayer,
} from "../map/map-point-layer";
import { getMapStyle } from "../map/map-style";
import "maplibre-gl/dist/maplibre-gl.css";

interface VisitsMapProps {
  markers: PublicVisitsMapMarker[];
  selectedYear?: number | null;
}

const MAP_BOUNDS_PADDING = 48;
const MAP_BOUNDS_MAX_ZOOM = 9;
const HOVER_CLOSE_DELAY = 250;
const POPUP_DETAIL_ROW_CLASS_NAME =
  "rounded-xl border border-sky-200/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(237,245,249,0.92))] px-3 py-2 shadow-[0_10px_20px_rgba(148,163,184,0.1),inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.76),rgba(2,6,23,0.58))] dark:shadow-[0_14px_24px_rgba(2,6,23,0.22),inset_0_1px_0_rgba(255,255,255,0.06)]";

interface MarkerTone {
  color: string;
}

const getMarkerTone = (visitCount: number): MarkerTone => {
  if (visitCount >= 4) {
    return {
      color: "#2563eb",
    };
  }

  if (visitCount >= 2) {
    return {
      color: "#0f766e",
    };
  }

  return {
    color: "#16a34a",
  };
};

const getMarkersBounds = (markers: PublicVisitsMapMarker[]): maplibregl.LngLatBoundsLike => {
  const first = markers[0];
  const combined = markers.reduce(
    (bounds, marker) => ({
      minLon: Math.min(bounds.minLon, marker.coordinates.lon),
      minLat: Math.min(bounds.minLat, marker.coordinates.lat),
      maxLon: Math.max(bounds.maxLon, marker.coordinates.lon),
      maxLat: Math.max(bounds.maxLat, marker.coordinates.lat),
    }),
    {
      minLon: first.coordinates.lon,
      minLat: first.coordinates.lat,
      maxLon: first.coordinates.lon,
      maxLat: first.coordinates.lat,
    },
  );

  return [
    [combined.minLon, combined.minLat],
    [combined.maxLon, combined.maxLat],
  ];
};

interface PopupLabels {
  openParkVisits: string;
  visitCount: string;
  visitCountInYear: string;
  years: string;
}

const createPopupDetailRow = (text: string) => {
  const row = document.createElement("p");
  row.className = POPUP_DETAIL_ROW_CLASS_NAME;
  row.textContent = text;
  return row;
};

const createPopupNode = (
  marker: PublicVisitsMapMarker,
  labels: PopupLabels,
  selectedYear: number | null,
): HTMLElement => {
  const container = document.createElement("div");
  container.className = "max-w-[280px] p-3 text-foreground";

  const header = document.createElement("header");
  header.className = "flex items-start gap-3";

  const pinIcon = document.createElement("span");
  pinIcon.appendChild(
    createMapPinSvg(getMarkerTone(marker.visitCount).color, "mt-0.5 h-4 w-4 shrink-0"),
  );

  const title = document.createElement("h3");
  title.className = "text-sm leading-tight font-semibold";
  title.textContent = marker.name;
  header.append(pinIcon, title);
  container.appendChild(header);

  const details = document.createElement("div");
  details.className = "mt-3 space-y-2 text-xs text-muted-foreground";
  details.appendChild(
    createPopupDetailRow(selectedYear === null ? labels.visitCount : labels.visitCountInYear),
  );
  if (selectedYear === null) {
    details.appendChild(createPopupDetailRow(`${labels.years}: ${marker.years.join(", ")}`));
  }
  container.appendChild(details);

  const actionRow = document.createElement("div");
  actionRow.className = "mt-3 flex justify-center";

  const link = document.createElement("a");
  link.href = createParkVisitHref({ parkSlug: marker.slug });
  link.className =
    "mt-3 inline-flex items-center rounded-full border border-sky-200/70 bg-white/74 px-3 py-1.5 text-xs font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-colors hover:bg-white/92 dark:border-sky-300/15 dark:bg-slate-950/62 dark:hover:bg-slate-950/78";
  link.textContent = labels.openParkVisits;
  link.addEventListener("click", (event) => event.stopPropagation());
  actionRow.appendChild(link);
  container.appendChild(actionRow);

  return container;
};

export const VisitsMap = ({ markers, selectedYear = null }: VisitsMapProps) => {
  const t = useTranslations("visits");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const popupSlugRef = useRef<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSlugRef = useRef<string | null>(null);
  const hoveredSlugRef = useRef<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const isEmpty = markers.length === 0;

  const cancelClose = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    hoverTimerRef.current = setTimeout(() => {
      setHoveredSlug(null);
      hoverTimerRef.current = null;
    }, HOVER_CLOSE_DELAY);
  }, [cancelClose]);

  const syncPopupVisibility = useCallback(
    (currentActiveSlug: string | null, currentHoveredSlug: string | null) => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      const slugToShow = currentActiveSlug ?? currentHoveredSlug;
      const marker = slugToShow ? markers.find(({ slug }) => slug === slugToShow) : undefined;

      if (!slugToShow || !marker) {
        popupRef.current?.remove();
        popupSlugRef.current = null;
        return;
      }

      const visitCountLabel = t("map.visitCount", { count: marker.visitCount });
      const visitCountInYearLabel =
        selectedYear === null
          ? visitCountLabel
          : t("map.visitCountInYear", {
              count: marker.visitCount,
              year: selectedYear,
            });
      const popup =
        popupRef.current ??
        new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          maxWidth: "240px",
          offset: 20,
        });

      popupRef.current = popup;
      popup.setLngLat([marker.coordinates.lon, marker.coordinates.lat]);
      if (popupSlugRef.current !== slugToShow) {
        const content = createPopupNode(
          marker,
          {
            openParkVisits: t("map.openParkVisits"),
            visitCount: visitCountLabel,
            visitCountInYear: visitCountInYearLabel,
            years: t("map.yearsLabel"),
          },
          selectedYear,
        );
        content.addEventListener("mouseenter", cancelClose);
        content.addEventListener("mouseleave", scheduleClose);
        popup.setDOMContent(content);
        popupSlugRef.current = slugToShow;
      }
      popup.addTo(map);
      setMapPopupInteractivity(popup, currentActiveSlug !== null);
    },
    [cancelClose, markers, scheduleClose, selectedYear, t],
  );

  useEffect(() => {
    activeSlugRef.current = activeSlug;
  }, [activeSlug]);

  useEffect(() => {
    hoveredSlugRef.current = hoveredSlug;
  }, [hoveredSlug]);

  // Initialize map. Depends on isEmpty so an empty result does not create WebGL work.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the map is (re)created only when the empty state flips; marker changes are applied by the effect below.
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || markers.length === 0) {
      return;
    }

    const map = new maplibregl.Map({
      container,
      style: getMapStyle(),
      bounds: getMarkersBounds(markers),
      fitBoundsOptions: {
        duration: 0,
        padding: MAP_BOUNDS_PADDING,
        maxZoom: MAP_BOUNDS_MAX_ZOOM,
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
      prepareMapPointIcon(map);
      setIsMapLoaded(true);
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelClose();
      popupRef.current?.remove();
      popupRef.current = null;
      popupSlugRef.current = null;
      map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, [isEmpty]);

  // Keep point data and one active popup in sync with the server-built marker list.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) {
      return;
    }

    syncMapPointLayer(
      map,
      markers.map((marker) => ({
        color: getMarkerTone(marker.visitCount).color,
        id: marker.slug,
        latitude: marker.coordinates.lat,
        longitude: marker.coordinates.lon,
      })),
    );

    map.fitBounds(getMarkersBounds(markers), {
      duration: 0,
      padding: MAP_BOUNDS_PADDING,
      maxZoom: MAP_BOUNDS_MAX_ZOOM,
    });

    const cleanupPointEvents = bindMapPointLayerEvents(map, {
      onPointClick: (slug) => {
        cancelClose();
        setHoveredSlug(null);
        setActiveSlug((current) => (current === slug ? null : slug));
      },
      onPointEnter: (slug) => {
        if (activeSlugRef.current && activeSlugRef.current !== slug) {
          return;
        }
        cancelClose();
        setHoveredSlug(slug);
      },
      onPointLeave: scheduleClose,
    });

    const handleMapClick = (event: maplibregl.MapMouseEvent) => {
      if (
        map.queryRenderedFeatures(event.point, {
          layers: [MAP_POINT_LAYER_ID],
        }).length === 0
      ) {
        cancelClose();
        setActiveSlug(null);
        setHoveredSlug(null);
      }
    };
    map.on("click", handleMapClick);

    syncPopupVisibility(activeSlugRef.current, hoveredSlugRef.current);

    return () => {
      cancelClose();
      cleanupPointEvents();
      map.off("click", handleMapClick);
    };
  }, [cancelClose, isMapLoaded, markers, scheduleClose, syncPopupVisibility]);

  useEffect(() => {
    syncPopupVisibility(activeSlug, hoveredSlug);
  }, [activeSlug, hoveredSlug, syncPopupVisibility]);

  useEffect(() => {
    if (!markers.some(({ slug }) => slug === activeSlug)) {
      setActiveSlug(null);
    }
    if (!markers.some(({ slug }) => slug === hoveredSlug)) {
      setHoveredSlug(null);
    }
  }, [activeSlug, hoveredSlug, markers]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelClose();
        setActiveSlug(null);
        setHoveredSlug(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cancelClose]);

  if (isEmpty) {
    return (
      <section className={PUBLIC_EMPTY_STATE_PANEL_CLASS_NAME}>
        <p className="text-muted-foreground">{t("map.empty")}</p>
      </section>
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-white/45 shadow-[0_22px_48px_rgba(148,163,184,0.2)] dark:border-white/10 dark:shadow-[0_26px_56px_rgba(2,6,23,0.38)]">
        <div
          ref={mapContainerRef}
          className="h-96 w-full md:h-128"
          role="application"
          aria-label={t("map.ariaLabel")}
        />
      </section>

      <section
        className="sr-only focus-within:not-sr-only"
        aria-labelledby="visits-map-list-heading"
      >
        <div className={PUBLIC_PANEL_CLASS_NAME}>
          <h2 id="visits-map-list-heading" className="text-lg font-semibold tracking-tight">
            {t("map.listTitle")}
          </h2>
          <ul className="mt-4 space-y-2">
            {markers.map((marker) => (
              <li key={marker.slug}>
                <Link
                  href={createParkVisitHref({ parkSlug: marker.slug })}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/45 bg-white/68 px-4 py-3 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.52)] transition-colors hover:bg-white/82 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/44 dark:hover:bg-slate-950/58"
                >
                  <span>{marker.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t("map.visitCount", { count: marker.visitCount })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
};
