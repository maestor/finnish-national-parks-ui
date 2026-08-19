import type * as maplibregl from "maplibre-gl";
import { describe, expect, it, vi } from "vitest";
import {
  MAP_POINT_ICON_ID,
  MAP_POINT_LAYER_ID,
  MAP_POINT_SOURCE_ID,
  setMapPointSelection,
  syncMapPointLayer,
} from "./map-point-layer";

const createMapMock = () => {
  const source = {
    type: "geojson" as const,
    setData: vi.fn(),
  };

  return {
    addLayer: vi.fn(),
    addSource: vi.fn(),
    getLayer: vi.fn(() => undefined),
    getSource: vi.fn(() => undefined),
    removeFeatureState: vi.fn(),
    setFeatureState: vi.fn(),
    source,
  };
};

describe("map point layer", () => {
  it("creates one GeoJSON source and one reusable pin layer", () => {
    const map = createMapMock();

    syncMapPointLayer(map as unknown as maplibregl.Map, [
      { color: "#16a34a", id: "nuuksio", latitude: 60.3, longitude: 24.5 },
    ]);

    expect(map.addSource).toHaveBeenCalledWith(
      MAP_POINT_SOURCE_ID,
      expect.objectContaining({ type: "geojson" }),
    );
    expect(map.addLayer).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: MAP_POINT_LAYER_ID,
        type: "symbol",
        layout: expect.objectContaining({
          "icon-allow-overlap": true,
          "icon-image": MAP_POINT_ICON_ID,
        }),
        paint: expect.objectContaining({ "icon-color": ["get", "color"] }),
      }),
    );
  });

  it("updates the existing source instead of rebuilding point layers", () => {
    const map = createMapMock();
    map.getSource.mockReturnValue(map.source as never);
    map.getLayer.mockReturnValue({ id: MAP_POINT_LAYER_ID } as never);

    syncMapPointLayer(map as unknown as maplibregl.Map, [
      { color: "#64748b", id: "pallas", latitude: 67.5, longitude: 23.5 },
    ]);

    expect(map.source.setData).toHaveBeenCalledWith(
      expect.objectContaining({
        features: [
          expect.objectContaining({
            id: "pallas",
            geometry: { coordinates: [23.5, 67.5], type: "Point" },
          }),
        ],
      }),
    );
    expect(map.addSource).not.toHaveBeenCalled();
    expect(map.addLayer).not.toHaveBeenCalled();
  });

  it("keeps only the selected point in feature state", () => {
    const map = createMapMock();

    setMapPointSelection(map as unknown as maplibregl.Map, "pallas", "nuuksio");

    expect(map.removeFeatureState).toHaveBeenCalledWith({
      source: MAP_POINT_SOURCE_ID,
      id: "pallas",
    });
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: MAP_POINT_SOURCE_ID, id: "nuuksio" },
      { selected: true },
    );
  });
});
