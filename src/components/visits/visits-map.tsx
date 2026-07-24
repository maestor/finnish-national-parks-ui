"use client";

import * as maplibregl from "maplibre-gl";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  PUBLIC_EMPTY_STATE_PANEL_CLASS_NAME,
  PUBLIC_PANEL_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { createParkVisitHref, type PublicVisitsMapMarker } from "@/lib/public-visits";
import { createMapPinSvg } from "../map/map-pin";
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

const createMarkerElement = (
  marker: PublicVisitsMapMarker,
  visitCountLabel: string,
): HTMLButtonElement => {
  const tone = getMarkerTone(marker.visitCount);
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "group flex h-8 w-8 cursor-pointer items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  button.setAttribute("aria-label", `${marker.name}, ${visitCountLabel}`);
  button.dataset.slug = marker.slug;
  button.appendChild(createMapPinSvg(tone.color));

  return button;
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
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupsRef = useRef<maplibregl.Popup[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const isEmpty = markers.length === 0;

  // Initialize map. Depends on isEmpty (not markers) so the map is created when
  // the first non-empty marker set arrives and torn down if it empties; bounds
  // updates for later filter changes happen in the marker effect below.
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
      setIsMapLoaded(true);
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      for (const popup of popupsRef.current) {
        popup.remove();
      }
      popupsRef.current = [];
      map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, [isEmpty]);

  // Create markers and popups once the map has loaded, and keep them in sync
  // with the server-built marker list when the filters change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) {
      return;
    }

    // Clear the previous marker set first so filter changes and dev-mode
    // effect re-runs never leave stale or duplicated pins on the map.
    for (const marker of markersRef.current) {
      marker.remove();
    }
    markersRef.current = [];
    for (const popup of popupsRef.current) {
      popup.remove();
    }
    popupsRef.current = [];

    if (markers.length === 0) {
      return;
    }

    map.fitBounds(getMarkersBounds(markers), {
      duration: 0,
      padding: MAP_BOUNDS_PADDING,
      maxZoom: MAP_BOUNDS_MAX_ZOOM,
    });

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

    for (const marker of markers) {
      const visitCountLabel = t("map.visitCount", { count: marker.visitCount });
      const visitCountInYearLabel =
        selectedYear === null
          ? visitCountLabel
          : t("map.visitCountInYear", {
              count: marker.visitCount,
              year: selectedYear,
            });
      const element = createMarkerElement(marker, visitCountLabel);
      const popupContent = createPopupNode(
        marker,
        {
          openParkVisits: t("map.openParkVisits"),
          visitCount: visitCountLabel,
          visitCountInYear: visitCountInYearLabel,
          years: t("map.yearsLabel"),
        },
        selectedYear,
      );

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: "240px",
        offset: 20,
      }).setLngLat([marker.coordinates.lon, marker.coordinates.lat]);
      popup.setDOMContent(popupContent);
      popupsRef.current.push(popup);

      popupContent.addEventListener("mouseenter", cancelClose);
      popupContent.addEventListener("mouseleave", scheduleClose);

      // Pointer clicks focus the marker first, so a click on a hovered/focused
      // popup should lock it open instead of immediately toggling it closed.
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

      const mapMarker = new maplibregl.Marker({ element, anchor: "bottom" })
        .setLngLat([marker.coordinates.lon, marker.coordinates.lat])
        .addTo(map);
      markersRef.current.push(mapMarker);
    }

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
  }, [isMapLoaded, markers, selectedYear, t]);

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
