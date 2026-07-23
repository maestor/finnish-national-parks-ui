import type * as maplibregl from "maplibre-gl";
import "./map-worker";

export const getMapStyle = (): string | maplibregl.StyleSpecification => {
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
