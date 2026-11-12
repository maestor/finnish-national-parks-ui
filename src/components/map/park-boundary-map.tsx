"use client";

import type { FeatureCollection } from "geojson";
import { Map as MapIcon } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { resolveTooltipPosition, TOOLTIP_CONTENT_CLASS_NAME } from "@/components/ui/tooltip";
import type { ParkDetail } from "@/lib/parks";
import { ThreeDotPulse } from "../ui/three-dot-pulse";
import { MAP_FLOATING_CONTROL_BUTTON_CLASS_NAME } from "./map-floating-control-styles";
import { getMapStyle } from "./map-style";
import "maplibre-gl/dist/maplibre-gl.css";
import "./park-boundary-map.css";

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
  visitedSlugs?: string[];
  selectedSlug?: string | null;
  previewSlug?: string | null;
  cameraRequest?: { slug: string | null; sequence: number } | null;
  onPreview?: (slug: string | null) => void;
  onPick?: (slug: string) => void;
  onReset?: () => void;
}

const EMPTY_TRAILS: NonNullable<ParkDetail["linkedTrails"]> = [];
const SOURCE_ID = "park-boundary";
const FILL_LAYER_ID = "park-boundary-fill";
const OUTLINE_LAYER_ID = "park-boundary-outline";
const TRAIL_SOURCE_ID = "park-trails";
const TRAIL_HALO_ID = "park-trails-halo";
const TRAIL_LINE_ID = "park-trails-line";
const TRAIL_VISITED_HALO_ID = "park-trails-visited-halo";
const TRAIL_VISITED_LINE_ID = "park-trails-visited-line";
const TRAIL_PREVIEW_HALO_ID = "park-trails-preview-halo";
const TRAIL_PREVIEW_LINE_ID = "park-trails-preview-line";
const TRAIL_ACTIVE_HALO_ID = "park-trails-active-halo";
const TRAIL_ACTIVE_LINE_ID = "park-trails-active-line";
const TRAIL_HIT_ID = "park-trails-hit";
const TRAIL_HALO_COLOR = "#fff8e7";
const TRAIL_PREVIEW_COLOR = "#a75b34";
const TRAIL_HALO_WIDTH = 5.5;
const TRAIL_HALO_OPACITY = 0.95;
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
  visitedSlugs = [],
  selectedSlug = null,
  previewSlug = null,
  cameraRequest = null,
  onPreview,
  onPick,
  onReset,
}: ParkBoundaryMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const destroyedRef = useRef(false);
  const t = useTranslations("map");
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const callbacksRef = useRef({ onPreview, onPick });
  callbacksRef.current = { onPreview, onPick };
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);
  const hoverElement = useRef<HTMLSpanElement>(null);
  const hoverPoint = useRef<{ x: number; y: number } | null>(null);
  const positionLabel = useCallback(() => {
    const label = hoverElement.current;
    const container = mapContainerRef.current;
    const point = hoverPoint.current;
    if (!label || !container || !point) return;
    const pos = resolveTooltipPosition({
      preferredSide: "top",
      tooltipHeight: label.offsetHeight,
      tooltipWidth: label.offsetWidth,
      triggerRect: { left: point.x, top: point.y, width: 0, height: 0 },
      viewportHeight: container.clientHeight,
      viewportWidth: container.clientWidth,
    });
    label.style.left = `${pos.left}px`;
    label.style.top = `${pos.top}px`;
  }, []);
  useEffect(() => {
    if (hoverLabel !== null) positionLabel();
  }, [hoverLabel, positionLabel]);

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
      map.remove();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    const boundaryData: FeatureCollection = {
      ...boundaryGeoJson,
      features: boundaryGeoJson.features.map((feature) => ({ ...feature, properties: {} })),
    };
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
      features: linkedTrails.flatMap((trail) =>
        trail.boundaryGeoJson.features
          .filter((feature) => feature.geometry.type === "LineString")
          .map((feature) => ({ ...feature, properties: { slug: trail.slug } })),
      ),
    };
    map.addSource(TRAIL_SOURCE_ID, { type: "geojson", data });
    map.addLayer({
      id: TRAIL_HALO_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      layout: TRAIL_LINE_LAYOUT,
      paint: { "line-color": TRAIL_HALO_COLOR, "line-width": 4.1, "line-opacity": 0.65 },
    });
    map.addLayer({
      id: TRAIL_LINE_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      layout: TRAIL_LINE_LAYOUT,
      paint: { "line-color": "#8d4b32", "line-width": 3 },
    });
    map.addLayer({
      id: TRAIL_VISITED_HALO_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      layout: TRAIL_LINE_LAYOUT,
      filter: ["==", ["get", "slug"], ""],
      paint: {
        "line-color": TRAIL_HALO_COLOR,
        "line-width": TRAIL_HALO_WIDTH,
        "line-opacity": TRAIL_HALO_OPACITY,
      },
    });
    map.addLayer({
      id: TRAIL_VISITED_LINE_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      layout: TRAIL_LINE_LAYOUT,
      filter: ["==", ["get", "slug"], ""],
      paint: { "line-color": TRAIL_PREVIEW_COLOR, "line-width": 3.5 },
    });
    map.addLayer({
      id: TRAIL_PREVIEW_HALO_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      layout: TRAIL_LINE_LAYOUT,
      filter: ["==", ["get", "slug"], ""],
      paint: { "line-color": TRAIL_HALO_COLOR, "line-width": 7.5, "line-opacity": 1 },
    });
    map.addLayer({
      id: TRAIL_PREVIEW_LINE_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      layout: TRAIL_LINE_LAYOUT,
      filter: ["==", ["get", "slug"], ""],
      paint: { "line-color": TRAIL_PREVIEW_COLOR, "line-width": 4.5 },
    });
    map.addLayer({
      id: TRAIL_ACTIVE_HALO_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      layout: TRAIL_LINE_LAYOUT,
      filter: ["==", ["get", "slug"], ""],
      paint: {
        "line-color": TRAIL_HALO_COLOR,
        "line-width": TRAIL_HALO_WIDTH,
        "line-opacity": TRAIL_HALO_OPACITY,
      },
    });
    map.addLayer({
      id: TRAIL_ACTIVE_LINE_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      layout: TRAIL_LINE_LAYOUT,
      filter: ["==", ["get", "slug"], ""],
      paint: { "line-color": "#65321f", "line-width": 3.5 },
    });
    map.addLayer({
      id: TRAIL_HIT_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      paint: { "line-color": "#000000", "line-opacity": 0, "line-width": 18 },
    });
    let hoveredSlug: string | null = null;
    let touchStart: { x: number; y: number } | null = null;
    let lastTouch = 0;
    const closestTrail = (point: maplibregl.Point) => {
      const hits = map.queryRenderedFeatures(
        [
          [point.x - 9, point.y - 9],
          [point.x + 9, point.y + 9],
        ],
        { layers: [TRAIL_HIT_ID] },
      );
      const distances = new Map<string, number>();
      for (const feature of hits) {
        const slug = feature.properties?.slug;
        if (typeof slug !== "string" || feature.geometry.type !== "LineString") continue;
        const points = feature.geometry.coordinates.map((coordinate) =>
          map.project([coordinate[0], coordinate[1]]),
        );
        let distance = Number.POSITIVE_INFINITY;
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1];
          const b = points[i];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const fraction = Math.max(
            0,
            Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
          );
          distance = Math.min(
            distance,
            Math.hypot(point.x - a.x - fraction * dx, point.y - a.y - fraction * dy),
          );
        }
        distances.set(slug, Math.min(distances.get(slug) ?? Infinity, distance));
      }
      return [...distances].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
    };
    const clearHover = () => {
      hoveredSlug = null;
      setHoverLabel(null);
      callbacksRef.current.onPreview?.(null);
    };
    const onMove = (event: maplibregl.MapMouseEvent) => {
      if (Date.now() - lastTouch < 700) return;
      const slug = closestTrail(event.point);
      hoveredSlug = slug;
      callbacksRef.current.onPreview?.(slug);
      hoverPoint.current = event.point;
      setHoverLabel(slug ?? null);
      positionLabel();
    };
    const onClick = (event: maplibregl.MapMouseEvent) => {
      if (Date.now() - lastTouch < 700) return;
      const slug = hoveredSlug ?? closestTrail(event.point);
      if (slug !== null) callbacksRef.current.onPick?.(slug);
    };
    const onTouchStart = (event: maplibregl.MapTouchEvent) => {
      lastTouch = Date.now();
      clearHover();
      touchStart = event.points.length === 1 ? event.points[0] : null;
    };
    const onTouchEnd = (event: maplibregl.MapTouchEvent) => {
      lastTouch = Date.now();
      const start = touchStart;
      touchStart = null;
      if (!start || event.originalEvent.changedTouches.length !== 1) return;
      const rect = map.getCanvas().getBoundingClientRect();
      const touch = event.originalEvent.changedTouches[0];
      const point = new maplibregl.Point(touch.clientX - rect.left, touch.clientY - rect.top);
      if (Math.hypot(point.x - start.x, point.y - start.y) > 8) return;
      const slug = closestTrail(point);
      if (slug !== null) callbacksRef.current.onPick?.(slug);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearHover();
    };
    window.addEventListener("blur", clearHover);
    window.addEventListener("keydown", onKey);
    map.on("mousemove", onMove);
    map.on("mouseout", clearHover);
    map.on("movestart", clearHover);
    map.on("click", onClick);
    map.on("touchstart", onTouchStart);
    map.on("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("blur", clearHover);
      window.removeEventListener("keydown", onKey);
      map.off("mousemove", onMove);
      map.off("mouseout", clearHover);
      map.off("movestart", clearHover);
      map.off("click", onClick);
      map.off("touchstart", onTouchStart);
      map.off("touchend", onTouchEnd);
      if (destroyedRef.current) return;
      for (const id of [
        TRAIL_HIT_ID,
        TRAIL_ACTIVE_LINE_ID,
        TRAIL_ACTIVE_HALO_ID,
        TRAIL_PREVIEW_LINE_ID,
        TRAIL_VISITED_HALO_ID,
        TRAIL_VISITED_LINE_ID,
        TRAIL_PREVIEW_HALO_ID,
        TRAIL_LINE_ID,
        TRAIL_HALO_ID,
      ])
        map.removeLayer(id);
      map.removeSource(TRAIL_SOURCE_ID);
    };
  }, [isMapLoaded, linkedTrails, positionLabel]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || !cameraRequest) return;
    if (cameraRequest.slug === null) {
      const bounds: maplibregl.LngLatBoundsLike = [
        [boundingBox.minLon, boundingBox.minLat],
        [boundingBox.maxLon, boundingBox.maxLat],
      ];
      map.setMinZoom(MAP_MIN_ZOOM);
      map.fitBounds(bounds, { padding: MAP_PADDING, duration: 0 });
      const camera = map.cameraForBounds(bounds, { padding: MAP_PADDING });
      if (typeof camera?.zoom === "number")
        map.setMinZoom(Math.max(MAP_MIN_ZOOM, camera.zoom - ZOOM_OUT_LEVELS_FROM_FIT));
      return;
    }
    const trail = linkedTrails.find((item) => item.slug === cameraRequest.slug);
    if (!trail) return;
    const bounds = new maplibregl.LngLatBounds();
    for (const feature of trail.boundaryGeoJson.features) {
      if (feature.geometry.type === "LineString")
        for (const [lng, lat] of feature.geometry.coordinates) bounds.extend([lng, lat]);
    }
    if (!bounds.isEmpty()) {
      map.setMinZoom(MAP_MIN_ZOOM);
      map.fitBounds(bounds.toArray(), {
        padding: MAP_PADDING,
        maxZoom: MAP_MAX_ZOOM,
        duration: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 600,
      });
    }
  }, [isMapLoaded, linkedTrails, cameraRequest, boundingBox]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || linkedTrails.length === 0) return;
    const hasActiveTrail = selectedSlug !== null || previewSlug !== null;
    const inactiveFilter: maplibregl.FilterSpecification | null = hasActiveTrail
      ? [
          "all",
          ["!=", ["get", "slug"], selectedSlug ?? ""],
          ["!=", ["get", "slug"], previewSlug ?? ""],
        ]
      : null;
    map.setFilter(TRAIL_HALO_ID, inactiveFilter);
    map.setFilter(TRAIL_LINE_ID, inactiveFilter);
    map.setPaintProperty(TRAIL_HALO_ID, "line-opacity", hasActiveTrail ? 0.25 : 0.65);
    map.setPaintProperty(TRAIL_LINE_ID, "line-width", hasActiveTrail ? 2.5 : 3);
    map.setPaintProperty(TRAIL_LINE_ID, "line-opacity", hasActiveTrail ? 0.5 : 1);
    const selectedFilter: maplibregl.FilterSpecification = [
      "==",
      ["get", "slug"],
      selectedSlug ?? "",
    ];
    const previewFilter: maplibregl.FilterSpecification = [
      "==",
      ["get", "slug"],
      previewSlug !== selectedSlug ? (previewSlug ?? "") : "",
    ];
    const visitedFilter: maplibregl.FilterSpecification = [
      "all",
      ["in", ["get", "slug"], ["literal", visitedSlugs]],
      ["!=", ["get", "slug"], selectedSlug ?? ""],
      ["!=", ["get", "slug"], previewSlug ?? ""],
    ];
    map.setPaintProperty(
      TRAIL_VISITED_HALO_ID,
      "line-opacity",
      previewSlug === null ? TRAIL_HALO_OPACITY : 0,
    );
    map.setPaintProperty(TRAIL_VISITED_LINE_ID, "line-opacity", previewSlug === null ? 1 : 0);
    map.setFilter(TRAIL_VISITED_HALO_ID, visitedFilter);
    map.setFilter(TRAIL_VISITED_LINE_ID, visitedFilter);
    map.setFilter(TRAIL_ACTIVE_HALO_ID, selectedFilter);
    map.setFilter(TRAIL_ACTIVE_LINE_ID, selectedFilter);
    map.setFilter(TRAIL_PREVIEW_HALO_ID, previewFilter);
    map.setFilter(TRAIL_PREVIEW_LINE_ID, previewFilter);
  }, [selectedSlug, previewSlug, isMapLoaded, linkedTrails, visitedSlugs]);

  const hoveredTrail = linkedTrails.find((trail) => trail.slug === hoverLabel);

  return (
    <div>
      <div
        className={
          linkedTrails.length
            ? "park-boundary-map-with-trails relative h-87.5 w-full overflow-hidden rounded-lg border md:h-107.5"
            : "relative h-80 w-full overflow-hidden rounded-lg border"
        }
      >
        <div
          ref={mapContainerRef}
          className="h-full w-full"
          role="application"
          aria-label={t("boundaryAriaLabel", { parkName })}
        />
        {hoveredTrail !== undefined && (
          <span
            ref={hoverElement}
            className={`${TOOLTIP_CONTENT_CLASS_NAME} absolute z-10 max-w-[min(calc(100%-1rem),20rem)]`}
          >
            <strong className="font-semibold">
              {hoveredTrail.name}
              {hoveredTrail.lengthKm != null && hoveredTrail.lengthKm !== 0
                ? ` · ${hoveredTrail.lengthKm.toLocaleString("fi-FI")} km`
                : ""}
            </strong>
          </span>
        )}
        {linkedTrails.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            className={`absolute bottom-3 left-3 ${MAP_FLOATING_CONTROL_BUTTON_CLASS_NAME}`}
            aria-label={t("wholeArea")}
            onClick={onReset}
          >
            <MapIcon aria-hidden="true" />
          </Button>
        )}
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
