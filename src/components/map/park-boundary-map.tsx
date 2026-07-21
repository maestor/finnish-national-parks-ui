"use client";

import maplibregl from "maplibre-gl";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { ParkDetail } from "@/lib/parks";
import { ThreeDotPulse } from "../ui/three-dot-pulse";
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
}

const SOURCE_ID = "park-boundary";
const FILL_LAYER_ID = "park-boundary-fill";
const OUTLINE_LAYER_ID = "park-boundary-outline";
const MAP_PADDING = 40;

export const ParkBoundaryMap = ({
  boundaryGeoJson,
  boundingBox,
  markerPoint,
  parkName,
}: ParkBoundaryMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const destroyedRef = useRef(false);
  const t = useTranslations("map");
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    destroyedRef.current = false;

    const map = new maplibregl.Map({
      container,
      style: getMapStyle(),
      minZoom: 3,
      maxZoom: 16,
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

    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: boundaryGeoJson,
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
      source.setData(boundaryGeoJson);
    }

    // Fit to bounding box with padding
    const bounds: maplibregl.LngLatBoundsLike = [
      [boundingBox.minLon, boundingBox.minLat],
      [boundingBox.maxLon, boundingBox.maxLat],
    ];

    map.fitBounds(bounds, { padding: MAP_PADDING, duration: 0 });

    const fittedCamera = map.cameraForBounds(bounds, { padding: MAP_PADDING });
    if (typeof fittedCamera?.zoom === "number") {
      map.setMinZoom(fittedCamera.zoom);
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

  return (
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
  );
};
