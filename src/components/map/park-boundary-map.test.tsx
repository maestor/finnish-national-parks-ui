import { act, fireEvent, render, screen } from "@testing-library/react";
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
    on: vi.fn((event: string, handlerOrLayer: (() => void) | string, layerHandler?: () => void) => {
      const handler = typeof handlerOrLayer === "function" ? handlerOrLayer : layerHandler;
      if (!handler) return;
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
    off: vi.fn(),
    setFilter: vi.fn(),
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
  // biome-ignore lint: Vitest v4 constructor mocks must be constructible.
  Map: vi.fn(function () {
    return mockMap;
  }),
  // biome-ignore lint: Vitest v4 constructor mocks must be constructible.
  Marker: vi.fn(function () {
    return createMockMarker();
  }),
  // biome-ignore lint: Vitest v4 constructor mocks must be constructible.
  Popup: vi.fn(function () {
    const element = document.createElement("div");
    const popup = {
      setLngLat: vi.fn().mockReturnThis(),
      setDOMContent: vi.fn((content: HTMLElement) => {
        element.replaceChildren(content);
        return popup;
      }),
      addTo: vi.fn(() => {
        document.body.appendChild(element);
        return popup;
      }),
      getElement: () => element,
      remove: () => element.remove(),
    };
    return popup;
  }),
  NavigationControl: vi.fn(),
  setWorkerUrl: vi.fn(),
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
        ] as [number, number][][],
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

  it("highlights a linked trail and shows its details when its label receives focus or is selected", () => {
    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Test Park"
        linkedTrails={[
          {
            name: "Sammalpolku",
            slug: "sammalpolku",
            address: "Polkutie 1, 00999 Testikylä",
            lengthKm: 2,
            boundaryGeoJson: {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: [
                      [24, 60],
                      [24.1, 60.1],
                    ],
                  },
                },
              ],
            },
          },
        ]}
      />,
    );
    const label = screen.getByRole("button", { name: "Sammalpolku" });
    fireEvent.focus(label);
    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "park-trails-active-line",
        paint: { "line-color": "#3fb1ce", "line-width": 4 },
      }),
    );
    expect(mockMap.setFilter).toHaveBeenCalledWith("park-trails-active-line", [
      "==",
      ["get", "index"],
      0,
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("2 km");
    expect(screen.getByRole("heading", { name: "Sammalpolku" })).toBeInTheDocument();
    expect(screen.getByText("Polkutie 1, 00999 Testikylä")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Polkutie 1, 00999 Testikylä");
    fireEvent.mouseEnter(label);
    fireEvent.mouseLeave(label);
    expect(screen.getByRole("status")).toHaveTextContent("Sammalpolku");
    fireEvent.blur(label);
    fireEvent.click(label);
    expect(label).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("2 km");
    fireEvent.blur(label);
    fireEvent.click(label);
    expect(label).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    fireEvent.mouseEnter(label);
    expect(screen.getByRole("status")).toHaveTextContent("Sammalpolku");
    fireEvent.mouseLeave(label);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("keeps the selected route above another route that shares its path", () => {
    const geometry = {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [24, 60],
              [24.1, 60.1],
            ],
          },
        },
      ],
    };
    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Koli"
        linkedTrails={[
          {
            name: "Kasken kierros",
            slug: "kasken-kierros",
            address: null,
            lengthKm: 5,
            boundaryGeoJson: geometry,
          },
          {
            name: "UKK-reitti",
            slug: "ukk-reitti",
            address: null,
            lengthKm: null,
            boundaryGeoJson: geometry,
          },
        ]}
      />,
    );
    const layers = mockMap.addLayer.mock.calls.map(([layer]) => (layer as { id: string }).id);
    expect(layers.indexOf("park-trails-active-line")).toBeGreaterThan(
      layers.indexOf("park-trails-line"),
    );
    expect(layers.indexOf("park-trails-active-halo")).toBeGreaterThan(
      layers.indexOf("park-trails-line"),
    );
    fireEvent.focus(screen.getByRole("button", { name: "Kasken kierros" }));
    expect(mockMap.setFilter).toHaveBeenCalledWith("park-trails-active-line", [
      "==",
      ["get", "index"],
      0,
    ]);
    expect(mockMap.setFilter).toHaveBeenCalledWith("park-trails-active-halo", [
      "==",
      ["get", "index"],
      0,
    ]);
    fireEvent.mouseEnter(screen.getByRole("button", { name: "UKK-reitti" }));
    expect(mockMap.setFilter).toHaveBeenCalledWith("park-trails-active-line", [
      "==",
      ["get", "index"],
      1,
    ]);
    expect(screen.getByRole("status")).toHaveTextContent("UKK-reitti");
    fireEvent.mouseLeave(screen.getByRole("button", { name: "UKK-reitti" }));
    expect(screen.getByRole("status")).toHaveTextContent("Kasken kierros");
    fireEvent.blur(screen.getByRole("button", { name: "Kasken kierros" }));
    expect(mockMap.setFilter).toHaveBeenLastCalledWith("park-trails-active-line", [
      "==",
      ["get", "index"],
      -1,
    ]);
  });

  it("shows trail details when the pointer moves over the route on the map", () => {
    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Test Park"
        linkedTrails={[
          {
            name: "Sammalpolku",
            slug: "sammalpolku",
            address: null,
            lengthKm: null,
            boundaryGeoJson: {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: [
                      [24, 60],
                      [24.1, 60.1],
                    ],
                  },
                },
              ],
            },
          },
        ]}
      />,
    );
    const move = mockMap.on.mock.calls.find(([event]) => event === "mousemove");
    expect(move).toBeDefined();
    const handler = move?.[2] as unknown as (event: {
      features: { properties: { index: number } }[];
      lngLat: { lng: number; lat: number };
    }) => void;
    act(() => handler({ features: [{ properties: { index: 0 } }], lngLat: { lng: 24, lat: 60 } }));
    expect(screen.getByRole("status")).toHaveTextContent("Sammalpolku");
    expect(mockMap.setFilter).toHaveBeenCalledWith("park-trails-active-line", [
      "==",
      ["get", "index"],
      0,
    ]);
    const leave = mockMap.on.mock.calls.find(([event]) => event === "mouseleave");
    const leaveHandler = leave?.[2] as unknown as () => void;
    act(() => leaveHandler());
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
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

  it("allows zooming out three levels from the fitted park bounds", () => {
    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Test Park"
      />,
    );

    expect(mockMap.cameraForBounds).toHaveBeenCalled();
    expect(mockMap.setMinZoom).toHaveBeenCalledWith(5);
  });

  it("does not allow zooming out past the shared map floor", () => {
    mockMap = createMockMap();
    mockMap.cameraForBounds = vi.fn(() => ({ zoom: 4 }));

    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Test Park"
      />,
    );

    expect(mockMap.setMinZoom).toHaveBeenCalledWith(3);
  });
});
