import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParkBoundaryMap } from "./park-boundary-map";

const createMockMarker = () => ({
  setLngLat: vi.fn().mockReturnThis(),
  addTo: vi.fn().mockReturnThis(),
  remove: vi.fn(),
});

const createMockMap = ({ autoLoad = true } = {}) => {
  const listeners: Record<string, (() => void)[]> = {};
  return {
    on: vi.fn((event: string, handler: () => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
      if (event === "load" && autoLoad) {
        handler();
      }
    }),
    triggerLoad: () => {
      for (const handler of listeners.load ?? []) {
        handler();
      }
    },
    remove: vi.fn(),
    resize: vi.fn(),
    addControl: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    getSource: vi.fn(),
    getLayer: vi.fn(),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    fitBounds: vi.fn(),
    cameraForBounds: vi.fn(() => ({ zoom: 8 })),
    setMinZoom: vi.fn(),
  };
};

class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

let mockMap = createMockMap();

vi.mock("maplibre-gl", () => ({
  default: {
    Map: vi.fn(() => mockMap),
    Marker: vi.fn(() => createMockMarker()),
    NavigationControl: vi.fn(),
  },
}));

const mockBoundaryGeoJson = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [24.0, 60.0],
            [24.1, 60.0],
            [24.1, 60.1],
            [24.0, 60.1],
            [24.0, 60.0],
          ],
        ],
      },
    },
  ],
};

const mockBoundingBox = {
  minLat: 60.0,
  maxLat: 60.1,
  minLon: 24.0,
  maxLon: 24.1,
};

const mockMarkerPoint = {
  lat: 60.05,
  lon: 24.05,
};

describe("ParkBoundaryMap", () => {
  beforeEach(() => {
    mockMap = createMockMap();
  });

  it("renders map container with accessible label", () => {
    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Test Park"
      />,
    );
    expect(screen.getByRole("application", { name: "map.boundaryAriaLabel" })).toBeInTheDocument();
  });

  it("shows loading spinner before map is loaded", () => {
    mockMap = createMockMap({ autoLoad: false });
    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Test Park"
      />,
    );
    expect(screen.getByText("map.loading")).toBeInTheDocument();
  });

  it("locks minimum zoom to the fitted park bounds", () => {
    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Test Park"
      />,
    );

    expect(mockMap.cameraForBounds).toHaveBeenCalled();
    expect(mockMap.setMinZoom).toHaveBeenCalledWith(8);
  });
});
