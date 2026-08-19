import type * as maplibregl from "maplibre-gl";
import { MAP_PIN_PATH } from "./map-pin-path";

export const MAP_POINT_SOURCE_ID = "public-map-points";
export const MAP_POINT_LAYER_ID = "public-map-points";
export const MAP_POINT_ICON_ID = "public-map-pin";

const MAP_POINT_ICON_SIZE = 48;

export interface MapPointLayerPoint {
  color: string;
  id: string;
  latitude: number;
  longitude: number;
}

interface MapPointFeatureProperties {
  color: string;
  id: string;
}

interface MapPointFeatureCollection {
  features: Array<{
    geometry: {
      coordinates: [number, number];
      type: "Point";
    };
    id: string;
    properties: MapPointFeatureProperties;
    type: "Feature";
  }>;
  type: "FeatureCollection";
}

const createMapPointFeatureCollection = (
  points: MapPointLayerPoint[],
): MapPointFeatureCollection => ({
  type: "FeatureCollection",
  features: points.map((point) => ({
    type: "Feature",
    id: point.id,
    properties: {
      color: point.color,
      id: point.id,
    },
    geometry: {
      type: "Point",
      coordinates: [point.longitude, point.latitude],
    },
  })),
});

const getPointSource = (map: maplibregl.Map): maplibregl.GeoJSONSource | undefined => {
  const source = map.getSource(MAP_POINT_SOURCE_ID);
  return source?.type === "geojson" ? (source as maplibregl.GeoJSONSource) : undefined;
};

export const syncMapPointLayer = (map: maplibregl.Map, points: MapPointLayerPoint[]) => {
  const data = createMapPointFeatureCollection(points);
  const source = getPointSource(map);

  if (source) {
    source.setData(data);
  } else {
    map.addSource(MAP_POINT_SOURCE_ID, {
      type: "geojson",
      data,
    });
  }

  if (!map.getLayer(MAP_POINT_LAYER_ID)) {
    map.addLayer({
      id: MAP_POINT_LAYER_ID,
      type: "symbol",
      source: MAP_POINT_SOURCE_ID,
      layout: {
        "icon-allow-overlap": true,
        "icon-anchor": "bottom",
        "icon-ignore-placement": true,
        "icon-image": MAP_POINT_ICON_ID,
        "icon-size": 1.1,
      },
      paint: {
        "icon-color": ["get", "color"],
        "icon-halo-blur": 0.2,
        "icon-halo-color": "#ffffff",
        "icon-halo-width": ["case", ["boolean", ["feature-state", "selected"], false], 2.5, 1],
        "icon-opacity": 0.98,
      },
    });
  }
};

const createMapPointIconImage = (): ImageData | undefined => {
  if (typeof document === "undefined" || typeof Path2D === "undefined") {
    return undefined;
  }

  const canvas = document.createElement("canvas");
  canvas.width = MAP_POINT_ICON_SIZE;
  canvas.height = MAP_POINT_ICON_SIZE;
  const context = canvas.getContext("2d");

  if (!context) {
    return undefined;
  }

  context.scale(2, 2);
  context.fillStyle = "#ffffff";
  context.fill(new Path2D(MAP_PIN_PATH));
  return context.getImageData(0, 0, MAP_POINT_ICON_SIZE, MAP_POINT_ICON_SIZE);
};

export const prepareMapPointIcon = (map: maplibregl.Map): boolean => {
  if (typeof map.hasImage !== "function" || typeof map.addImage !== "function") {
    return false;
  }

  if (map.hasImage(MAP_POINT_ICON_ID)) {
    return true;
  }

  const image = createMapPointIconImage();
  if (!image) {
    return false;
  }

  map.addImage(MAP_POINT_ICON_ID, image, { pixelRatio: 2, sdf: true });
  return true;
};

export const setMapPopupInteractivity = (popup: maplibregl.Popup, isInteractive: boolean) => {
  popup.getElement().style.pointerEvents = isInteractive ? "auto" : "none";
};

export const setMapPointSelection = (
  map: maplibregl.Map,
  previousId: string | null,
  nextId: string | null,
) => {
  if (previousId && previousId !== nextId) {
    map.removeFeatureState({ source: MAP_POINT_SOURCE_ID, id: previousId });
  }

  if (nextId) {
    map.setFeatureState({ source: MAP_POINT_SOURCE_ID, id: nextId }, { selected: true });
  }
};

export const getMapPointIdFromEvent = (
  map: maplibregl.Map,
  event: maplibregl.MapMouseEvent,
): string | null => {
  const feature = map.queryRenderedFeatures(event.point, {
    layers: [MAP_POINT_LAYER_ID],
  })[0];
  const id = feature?.properties?.id;
  return typeof id === "string" ? id : null;
};

export const bindMapPointLayerEvents = (
  map: maplibregl.Map,
  handlers: {
    onPointClick: (id: string, event: maplibregl.MapMouseEvent) => void;
    onPointEnter: (id: string, event: maplibregl.MapMouseEvent) => void;
    onPointLeave: (event: maplibregl.MapMouseEvent) => void;
  },
) => {
  let hoveredPointId: string | null = null;

  const handlePointClick = (event: maplibregl.MapMouseEvent) => {
    const id = getMapPointIdFromEvent(map, event);
    if (id) {
      handlers.onPointClick(id, event);
    }
  };
  const handlePointMove = (event: maplibregl.MapMouseEvent) => {
    const id = getMapPointIdFromEvent(map, event);
    if (!id) {
      return;
    }

    map.getCanvas().style.cursor = "pointer";
    if (id === hoveredPointId) {
      return;
    }

    hoveredPointId = id;
    handlers.onPointEnter(id, event);
  };
  const handlePointLeave = (event: maplibregl.MapMouseEvent) => {
    hoveredPointId = null;
    map.getCanvas().style.cursor = "";
    handlers.onPointLeave(event);
  };
  map.on("click", MAP_POINT_LAYER_ID, handlePointClick);
  map.on("mouseenter", MAP_POINT_LAYER_ID, handlePointMove);
  map.on("mousemove", MAP_POINT_LAYER_ID, handlePointMove);
  map.on("mouseleave", MAP_POINT_LAYER_ID, handlePointLeave);

  return () => {
    map.off("click", MAP_POINT_LAYER_ID, handlePointClick);
    map.off("mouseenter", MAP_POINT_LAYER_ID, handlePointMove);
    map.off("mousemove", MAP_POINT_LAYER_ID, handlePointMove);
    map.off("mouseleave", MAP_POINT_LAYER_ID, handlePointLeave);
    map.getCanvas().style.cursor = "";
  };
};
