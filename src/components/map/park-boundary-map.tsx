"use client";

import type { FeatureCollection } from "geojson";
import { Route } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { PUBLIC_ROUTE_BADGE_CLASS_NAME } from "@/components/layout/public-page-styles";
import type { ParkDetail } from "@/lib/parks";
import { ThreeDotPulse } from "../ui/three-dot-pulse";
import { useDeferredMapPower } from "./deferred-map";
import { getMapStyle } from "./map-style";
import "maplibre-gl/dist/maplibre-gl.css";

type BoundaryGeoJson = NonNullable<ParkDetail["boundaryGeoJson"]>;

interface ParkBoundaryMapProps {
  boundaryGeoJson: BoundaryGeoJson;
  boundingBox: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  markerPoint: {
    lat: number;
    lon: number;
  };
  parkName: string;
  linkedTrails?: NonNullable<ParkDetail["linkedTrails"]>;
}

const EMPTY_TRAILS: NonNullable<ParkDetail["linkedTrails"]> = [];
const SOURCE_ID = "park-boundary";
const FILL_LAYER_ID = "park-boundary-fill";
const OUTLINE_LAYER_ID = "park-boundary-outline";
const TRAIL_SOURCE_ID = "park-trails";
const TRAIL_HALO_ID = "park-trails-halo";
const TRAIL_LINE_ID = "park-trails-line";
const TRAIL_ACTIVE_HALO_ID = "park-trails-active-halo";
const TRAIL_ACTIVE_LINE_ID = "park-trails-active-line";
const TRAIL_HIT_ID = "park-trails-hit";
const TRAIL_LINE_LAYOUT = { "line-cap": "round", "line-join": "round" } as const;
const MAP_PADDING = 40;
const MAP_MIN_ZOOM = 3;
const MAP_MAX_ZOOM = 16;
const ZOOM_OUT_LEVELS_FROM_FIT = 3;

export const ParkBoundaryMap = ({
  boundaryGeoJson,
  boundingBox,
  markerPoint,
  parkName,
  linkedTrails = EMPTY_TRAILS,
}: ParkBoundaryMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const hoverPositionRef = useRef<maplibregl.LngLatLike | null>(null);
  const destroyedRef = useRef(false);
  const t = useTranslations("map");
  const lowPower = useDeferredMapPower();
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [hoveredTrail, setHoveredTrail] = useState<number | null>(null);
  const [focusedTrail, setFocusedTrail] = useState<number | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<number | null>(null);
  const [trailFocusRequest, setTrailFocusRequest] = useState<{ index: number } | null>(null);
  const activeTrail = hoveredTrail ?? focusedTrail ?? selectedTrail;

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    destroyedRef.current = false;

    const map = new maplibregl.Map({
      container,
      style: getMapStyle(),
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
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
      resizeObserver.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || typeof map.setPixelRatio !== "function") {
      return;
    }

    map.setPixelRatio(lowPower ? 1 : window.devicePixelRatio);
  }, [isMapLoaded, lowPower]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const boundaryData: FeatureCollection = {
      ...boundaryGeoJson,
      features: boundaryGeoJson.features.map((feature) => ({ ...feature, properties: {} })),
    };
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: boundaryData,
      });

      map.addLayer({
        id: FILL_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": "hsl(142 76% 36%)",
          "fill-opacity": 0.2,
        },
      });

      map.addLayer({
        id: OUTLINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": "hsl(142 76% 36%)",
          "line-width": 2,
        },
      });
    } else {
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
      source.setData(boundaryData);
    }

    // Fit to bounding box with padding
    const bounds: maplibregl.LngLatBoundsLike = [
      [boundingBox.minLon, boundingBox.minLat],
      [boundingBox.maxLon, boundingBox.maxLat],
    ];

    map.fitBounds(bounds, { padding: MAP_PADDING, duration: 0 });

    const fittedCamera = map.cameraForBounds(bounds, { padding: MAP_PADDING });
    if (typeof fittedCamera?.zoom === "number") {
      map.setMinZoom(Math.max(MAP_MIN_ZOOM, fittedCamera.zoom - ZOOM_OUT_LEVELS_FROM_FIT));
    }

    // Add marker at park center
    markerRef.current?.remove();
    markerRef.current = new maplibregl.Marker()
      .setLngLat([markerPoint.lon, markerPoint.lat])
      .addTo(map);

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      if (destroyedRef.current) return;
      if (map.getLayer(FILL_LAYER_ID)) {
        map.removeLayer(FILL_LAYER_ID);
      }
      if (map.getLayer(OUTLINE_LAYER_ID)) {
        map.removeLayer(OUTLINE_LAYER_ID);
      }
      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }
    };
  }, [boundaryGeoJson, boundingBox, markerPoint, isMapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || linkedTrails.length === 0) return;
    const data: FeatureCollection = {
      type: "FeatureCollection",
      features: linkedTrails.flatMap((trail, index) =>
        trail.boundaryGeoJson.features
          .filter((feature) => feature.geometry.type === "LineString")
          .map((feature) => ({ ...feature, properties: { index } })),
      ),
    };
    map.addSource(TRAIL_SOURCE_ID, { type: "geojson", data });
    map.addLayer({
      id: TRAIL_HALO_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      layout: TRAIL_LINE_LAYOUT,
      paint: { "line-color": "#fff8e7", "line-width": 4.1, "line-opacity": 0.65 },
    });
    map.addLayer({
      id: TRAIL_LINE_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      layout: TRAIL_LINE_LAYOUT,
      paint: { "line-color": "#8d4b32", "line-width": 3 },
    });
    map.addLayer({
      id: TRAIL_ACTIVE_HALO_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      layout: TRAIL_LINE_LAYOUT,
      filter: ["==", ["get", "index"], -1],
      paint: { "line-color": "#fff8e7", "line-width": 5.5, "line-opacity": 0.95 },
    });
    map.addLayer({
      id: TRAIL_ACTIVE_LINE_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      layout: TRAIL_LINE_LAYOUT,
      filter: ["==", ["get", "index"], -1],
      paint: { "line-color": "#65321f", "line-width": 3.5 },
    });
    map.addLayer({
      id: TRAIL_HIT_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      paint: { "line-color": "#000000", "line-opacity": 0, "line-width": 18 },
    });
    const onMove = (event: maplibregl.MapLayerMouseEvent) => {
      const index = event.features?.[0]?.properties?.index;
      if (typeof index === "number") {
        hoverPositionRef.current = event.lngLat;
        popupRef.current?.setLngLat(event.lngLat);
        setHoveredTrail(index);
      }
    };
    const onLeave = () => {
      hoverPositionRef.current = null;
      setHoveredTrail(null);
    };
    const onClick = (event: maplibregl.MapLayerMouseEvent) => {
      const index = event.features?.[0]?.properties?.index;
      if (typeof index === "number") {
        hoverPositionRef.current = event.lngLat;
        setSelectedTrail(index);
        setTrailFocusRequest({ index });
      }
    };
    map.on("mousemove", TRAIL_HIT_ID, onMove);
    map.on("mouseleave", TRAIL_HIT_ID, onLeave);
    map.on("click", TRAIL_HIT_ID, onClick);
    return () => {
      map.off("mousemove", TRAIL_HIT_ID, onMove);
      map.off("mouseleave", TRAIL_HIT_ID, onLeave);
      map.off("click", TRAIL_HIT_ID, onClick);
      if (destroyedRef.current) return;
      for (const id of [
        TRAIL_HIT_ID,
        TRAIL_ACTIVE_LINE_ID,
        TRAIL_ACTIVE_HALO_ID,
        TRAIL_LINE_ID,
        TRAIL_HALO_ID,
      ])
        map.removeLayer(id);
      map.removeSource(TRAIL_SOURCE_ID);
    };
  }, [isMapLoaded, linkedTrails]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || trailFocusRequest === null) return;
    const trail = linkedTrails[trailFocusRequest.index];
    const bounds = new maplibregl.LngLatBounds();
    for (const feature of trail.boundaryGeoJson.features) {
      if (feature.geometry.type !== "LineString") continue;
      for (const [lng, lat] of feature.geometry.coordinates) {
        bounds.extend([lng, lat]);
      }
    }
    if (!bounds.isEmpty()) {
      map.setMinZoom(MAP_MIN_ZOOM);
      map.fitBounds(bounds.toArray(), {
        padding: MAP_PADDING,
        maxZoom: MAP_MAX_ZOOM,
        duration: 600,
      });
    }
    setTrailFocusRequest(null);
  }, [isMapLoaded, linkedTrails, trailFocusRequest]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || linkedTrails.length === 0) return;
    const hasActiveTrail = activeTrail !== null;
    const inactiveFilter: maplibregl.FilterSpecification | null =
      activeTrail === null ? null : ["!=", ["get", "index"], activeTrail];
    map.setFilter(TRAIL_HALO_ID, inactiveFilter);
    map.setFilter(TRAIL_LINE_ID, inactiveFilter);
    map.setPaintProperty(TRAIL_HALO_ID, "line-opacity", hasActiveTrail ? 0.25 : 0.65);
    map.setPaintProperty(TRAIL_LINE_ID, "line-width", hasActiveTrail ? 2.5 : 3);
    map.setPaintProperty(TRAIL_LINE_ID, "line-opacity", hasActiveTrail ? 0.5 : 1);
    const filter: maplibregl.FilterSpecification = ["==", ["get", "index"], activeTrail ?? -1];
    map.setFilter(TRAIL_ACTIVE_HALO_ID, filter);
    map.setFilter(TRAIL_ACTIVE_LINE_ID, filter);
  }, [activeTrail, isMapLoaded, linkedTrails]);

  useEffect(() => {
    const map = mapRef.current;
    const trail = activeTrail === null ? undefined : linkedTrails[activeTrail];
    if (!map || !isMapLoaded || !trail) {
      popupRef.current?.remove();
      popupRef.current = null;
      return;
    }
    const line = trail.boundaryGeoJson.features.find(
      (feature) => feature.geometry.type === "LineString",
    );
    const coordinates = line?.geometry.type === "LineString" ? line.geometry.coordinates : [];
    const point = coordinates[Math.floor(coordinates.length / 2)];
    if (!point || point[0] === undefined || point[1] === undefined) return;
    const content = document.createElement("div");
    content.className = "p-3 text-foreground";
    const title = document.createElement("h3");
    title.className = "text-sm leading-tight font-semibold";
    title.textContent =
      trail.lengthKm === null
        ? trail.name
        : t("trailPopupTitle", {
            name: trail.name,
            length: trail.lengthKm.toLocaleString("fi-FI"),
          });
    content.appendChild(title);
    if (trail.address) {
      const address = document.createElement("p");
      address.className = "mt-1 text-sm";
      address.textContent = trail.address;
      content.appendChild(address);
    }
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "min(360px, calc(100vw - 5rem))",
      offset: 12,
    });
    popupRef.current = popup;
    popup
      .setLngLat(hoverPositionRef.current ?? [point[0], point[1]])
      .setDOMContent(content)
      .addTo(map);
    popup.getElement().style.pointerEvents = "none";
    return () => {
      popup.remove();
      if (popupRef.current === popup) popupRef.current = null;
    };
  }, [activeTrail, isMapLoaded, linkedTrails, t]);

  return (
    <div>
      {linkedTrails.length > 0 && (
        <fieldset className="mb-3 flex flex-wrap gap-2">
          <legend className="sr-only">{t("trails")}</legend>
          {linkedTrails.map((trail, index) => (
            <button
              key={trail.slug}
              type="button"
              aria-pressed={selectedTrail === index}
              className={`${PUBLIC_ROUTE_BADGE_CLASS_NAME} cursor-pointer transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${activeTrail === index ? "ring-2 ring-ring" : ""}`}
              onMouseEnter={() => {
                hoverPositionRef.current = null;
                setHoveredTrail(index);
              }}
              onMouseLeave={() => setHoveredTrail(null)}
              onFocus={() => {
                hoverPositionRef.current = null;
                setFocusedTrail(index);
              }}
              onBlur={() => setFocusedTrail(null)}
              onClick={() => {
                setSelectedTrail(selectedTrail === index ? null : index);
                setTrailFocusRequest({ index });
              }}
            >
              <Route className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="wrap-anywhere text-left">{trail.name}</span>
            </button>
          ))}
        </fieldset>
      )}
      <span className="sr-only" role="status">
        {activeTrail !== null &&
          linkedTrails[activeTrail] &&
          `${linkedTrails[activeTrail].name}${linkedTrails[activeTrail].lengthKm !== null ? `, ${t("trailLength")} ${linkedTrails[activeTrail].lengthKm.toLocaleString("fi-FI")} km` : ""}${linkedTrails[activeTrail].address ? `, ${linkedTrails[activeTrail].address}` : ""}`}
      </span>
      <div className="relative w-full overflow-hidden rounded-lg border" style={{ height: 320 }}>
        <div
          ref={mapContainerRef}
          className="h-full w-full"
          role="application"
          aria-label={t("boundaryAriaLabel", { parkName })}
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
    </div>
  );
};
