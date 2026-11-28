import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/test/i18n";
import { ParkBoundaryMap } from "./park-boundary-map";

vi.unmock("next-intl");

const createMockMarker = () => ({
  setLngLat: vi.fn().mockReturnThis(),
  addTo: vi.fn().mockReturnThis(),
  remove: vi.fn(),
});

const createMockMap = ({ autoLoad = true } = {}) => {
  const listeners: Record<string, (() => void)[]> = {};
  const canvas = { style: { cursor: "" }, getBoundingClientRect: () => ({ left: 0, top: 0 }) };
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
    setPaintProperty: vi.fn(),
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
    queryRenderedFeatures: vi.fn(
      (): {
        properties: { slug: string };
        geometry: { type: string; coordinates: number[][] };
      }[] => [],
    ),
    project: vi.fn(([x, y]: [number, number]) => ({ x, y })),
    getCanvas: vi.fn(() => canvas),
  };
};

let mockMap = createMockMap();

vi.mock("maplibre-gl", async (importOriginal) => ({
  LngLatBounds: (await importOriginal<typeof import("maplibre-gl")>()).LngLatBounds,
  Point: (await importOriginal<typeof import("maplibre-gl")>()).Point,
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

const mockLinkedTrail = {
  name: "Pitkä reitti",
  slug: "pitka-reitti",
  address: null,
  lengthKm: 42,
  boundaryGeoJson: {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [24.2, 60.2],
            [24.5, 60.7],
          ],
        },
      },
      {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [23, 59],
            [27, 62],
          ],
        },
      },
      ...mockBoundaryGeoJson.features,
    ],
  },
};

describe("ParkBoundaryMap", () => {
  beforeEach(() => {
    mockMap = createMockMap();
  });

  it("draws every line of a multi-part trail with the same selection identity", () => {
    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Test Park"
        linkedTrails={[mockLinkedTrail]}
      />,
      { wrapper: I18nProvider },
    );
    const lineFeatures = mockLinkedTrail.boundaryGeoJson.features.filter(
      (feature) => feature.geometry.type === "LineString",
    );
    expect(mockMap.addSource).toHaveBeenCalledWith("park-trails", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: lineFeatures.map((feature) => ({
          ...feature,
          properties: { slug: "pitka-reitti" },
        })),
      },
    });
  });

  it("updates persistent visited layers without moving the camera or replacing geometry", () => {
    const props = {
      boundaryGeoJson: mockBoundaryGeoJson,
      boundingBox: mockBoundingBox,
      markerPoint: mockMarkerPoint,
      parkName: "Test Park",
      linkedTrails: [mockLinkedTrail, { ...mockLinkedTrail, slug: "third" }],
    };
    const { rerender, unmount } = render(<ParkBoundaryMap {...props} visitedSlugs={[]} />, {
      wrapper: I18nProvider,
    });
    mockMap.fitBounds.mockClear();
    mockMap.addSource.mockClear();
    rerender(
      <ParkBoundaryMap
        {...props}
        visitedSlugs={["pitka-reitti"]}
        selectedSlug="other"
        previewSlug="third"
      />,
    );
    expect(mockMap.setFilter).toHaveBeenCalledWith("park-trails-visited-line", [
      "all",
      ["in", ["get", "slug"], ["literal", ["pitka-reitti"]]],
      ["!=", ["get", "slug"], "other"],
      ["!=", ["get", "slug"], "third"],
    ]);
    expect(mockMap.setPaintProperty).toHaveBeenCalledWith(
      "park-trails-visited-line",
      "line-opacity",
      0,
    );
    expect(mockMap.setPaintProperty).toHaveBeenCalledWith(
      "park-trails-visited-halo",
      "line-opacity",
      0,
    );
    rerender(<ParkBoundaryMap {...props} visitedSlugs={["pitka-reitti"]} selectedSlug="other" />);
    expect(mockMap.setPaintProperty).toHaveBeenLastCalledWith(
      "park-trails-visited-line",
      "line-opacity",
      1,
    );
    expect(mockMap.setPaintProperty).toHaveBeenCalledWith(
      "park-trails-visited-halo",
      "line-opacity",
      0.95,
    );
    expect(mockMap.fitBounds).not.toHaveBeenCalled();
    expect(mockMap.addSource).not.toHaveBeenCalled();
    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "park-trails-preview-line",
        paint: { "line-color": "#a75b34", "line-width": 4.5 },
      }),
    );
    unmount();
    expect(mockMap.remove).toHaveBeenCalled();
  });
  it("fits all segments on explicit requests, including repeated selection", () => {
    const props = {
      boundaryGeoJson: mockBoundaryGeoJson,
      boundingBox: mockBoundingBox,
      markerPoint: mockMarkerPoint,
      parkName: "Test Park",
      linkedTrails: [mockLinkedTrail],
    };
    const { rerender } = render(<ParkBoundaryMap {...props} />, { wrapper: I18nProvider });
    mockMap.fitBounds.mockClear();
    rerender(
      <ParkBoundaryMap
        {...props}
        selectedSlug="pitka-reitti"
        cameraRequest={{ slug: "pitka-reitti", sequence: 1 }}
      />,
    );
    expect(mockMap.fitBounds).toHaveBeenCalledWith(
      [
        [23, 59],
        [27, 62],
      ],
      expect.objectContaining({ maxZoom: 16 }),
    );
    rerender(
      <ParkBoundaryMap
        {...props}
        selectedSlug="pitka-reitti"
        cameraRequest={{ slug: "pitka-reitti", sequence: 2 }}
      />,
    );
    expect(mockMap.fitBounds).toHaveBeenCalledTimes(2);
    rerender(<ParkBoundaryMap {...props} cameraRequest={{ slug: null, sequence: 3 }} />);
    expect(mockMap.setMinZoom).toHaveBeenLastCalledWith(5);
  });
  it("applies a request made before the map loads", () => {
    mockMap = createMockMap({ autoLoad: false });
    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Test Park"
        linkedTrails={[mockLinkedTrail]}
        cameraRequest={{ slug: "pitka-reitti", sequence: 1 }}
      />,
      { wrapper: I18nProvider },
    );
    expect(mockMap.fitBounds).not.toHaveBeenCalled();
    act(() => mockMap.triggerLoad());
    expect(mockMap.fitBounds).toHaveBeenCalledWith(
      [
        [23, 59],
        [27, 62],
      ],
      expect.objectContaining({ maxZoom: 16 }),
    );
  });
  it("shows linked polygons initially and previews and selects both area parts", () => {
    const onPreview = vi.fn();
    const onPick = vi.fn();
    const props = {
      boundaryGeoJson: mockBoundaryGeoJson,
      boundingBox: mockBoundingBox,
      markerPoint: mockMarkerPoint,
      parkName: "Test Park",
      onPreview,
      onPick,
      linkedAreas: [
        {
          id: 8,
          slug: "langinkoski",
          name: "Langinkoski",
          boundaryGeoJson: {
            type: "FeatureCollection" as const,
            features: [
              {
                type: "Feature" as const,
                geometry: {
                  type: "Polygon" as const,
                  coordinates: [
                    [
                      [26, 60],
                      [27, 60],
                      [26, 61],
                      [26, 60],
                    ],
                  ] as [number, number][][],
                },
              },
              {
                type: "Feature" as const,
                geometry: {
                  type: "Polygon" as const,
                  coordinates: [
                    [
                      [28, 63],
                      [29, 63],
                      [28, 64],
                      [28, 63],
                    ],
                  ] as [number, number][][],
                },
              },
            ],
          },
        },
      ],
    };
    const { rerender } = render(<ParkBoundaryMap {...props} />, { wrapper: I18nProvider });
    expect(mockMap.addSource).toHaveBeenCalledWith("park-subareas", {
      type: "geojson",
      data: expect.objectContaining({
        features: props.linkedAreas[0].boundaryGeoJson.features.map((feature) => ({
          ...feature,
          properties: { slug: "langinkoski" },
        })),
      }),
    });
    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "park-subareas-fill",
        paint: expect.objectContaining({ "fill-opacity": 0.14 }),
      }),
      undefined,
    );
    mockMap.queryRenderedFeatures.mockReturnValue([
      { properties: { slug: "langinkoski" }, geometry: { type: "Polygon", coordinates: [] } },
    ]);
    const point = { point: { x: 5, y: 5 } };
    const move = mockMap.on.mock.calls.find(([event]) => event === "mousemove")?.[1] as unknown as (
      event: typeof point,
    ) => void;
    const click = mockMap.on.mock.calls.find(([event]) => event === "click")?.[1] as unknown as (
      event: typeof point,
    ) => void;
    act(() => move(point));
    expect(mockMap.queryRenderedFeatures).toHaveBeenCalledWith(point.point, {
      layers: ["park-subareas-fill"],
    });
    expect(onPreview).toHaveBeenCalledWith("langinkoski");
    expect(screen.getByText("Langinkoski")).toBeVisible();
    expect(mockMap.getCanvas().style.cursor).toBe("pointer");
    rerender(<ParkBoundaryMap {...props} previewSlug="langinkoski" />);
    expect(mockMap.setPaintProperty).toHaveBeenCalledWith("park-subareas-fill", "fill-opacity", [
      "case",
      ["==", ["get", "slug"], ""],
      0.32,
      ["==", ["get", "slug"], "langinkoski"],
      0.25,
      0.14,
    ]);
    act(() => click(point));
    expect(onPick).toHaveBeenCalledWith("langinkoski");
    mockMap.queryRenderedFeatures.mockReturnValue([]);
    act(() => move(point));
    expect(onPreview).toHaveBeenLastCalledWith(null);
    expect(mockMap.getCanvas().style.cursor).toBe("");
    mockMap.fitBounds.mockClear();
    rerender(
      <ParkBoundaryMap
        {...props}
        selectedSlug="langinkoski"
        cameraRequest={{ slug: "langinkoski", sequence: 1 }}
      />,
    );
    expect(mockMap.setPaintProperty).toHaveBeenCalledWith("park-subareas-fill", "fill-opacity", [
      "case",
      ["==", ["get", "slug"], "langinkoski"],
      0.32,
      ["==", ["get", "slug"], ""],
      0.25,
      0.14,
    ]);
    expect(mockMap.fitBounds).toHaveBeenCalledWith(
      [
        [26, 60],
        [29, 64],
      ],
      expect.any(Object),
    );
    rerender(<ParkBoundaryMap {...props} cameraRequest={{ slug: null, sequence: 2 }} />);
    expect(mockMap.setPaintProperty).toHaveBeenLastCalledWith(
      "park-subareas-outline",
      "line-width",
      ["case", ["==", ["get", "slug"], ""], 3, ["==", ["get", "slug"], ""], 2.5, 1.5],
    );
  });

  it("does not move for an undrawable trail and keeps preview separate from selection", () => {
    const undrawable = { ...mockLinkedTrail, boundaryGeoJson: mockBoundaryGeoJson };
    const props = {
      boundaryGeoJson: mockBoundaryGeoJson,
      boundingBox: mockBoundingBox,
      markerPoint: mockMarkerPoint,
      parkName: "Test Park",
      linkedTrails: [undrawable],
    };
    const { rerender } = render(<ParkBoundaryMap {...props} />, { wrapper: I18nProvider });
    mockMap.fitBounds.mockClear();
    rerender(<ParkBoundaryMap {...props} previewSlug="pitka-reitti" />);
    expect(mockMap.fitBounds).not.toHaveBeenCalled();
    expect(mockMap.setFilter).toHaveBeenCalledWith("park-trails-preview-line", [
      "==",
      ["get", "slug"],
      "pitka-reitti",
    ]);
    rerender(
      <ParkBoundaryMap
        {...props}
        selectedSlug="pitka-reitti"
        cameraRequest={{ slug: "pitka-reitti", sequence: 1 }}
      />,
    );
    expect(mockMap.fitBounds).not.toHaveBeenCalled();
    const layers = mockMap.addLayer.mock.calls.map(([layer]) => (layer as { id: string }).id);
    expect(layers.indexOf("park-trails-active-line")).toBeGreaterThan(
      layers.indexOf("park-trails-line"),
    );
  });

  it("selects the closest trail on its line and the area away from the line", () => {
    const onPick = vi.fn();
    const onPreview = vi.fn();
    mockMap.queryRenderedFeatures = vi.fn(() => [
      {
        properties: { slug: "far" },
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 4],
            [10, 4],
          ],
        },
      },
      {
        properties: { slug: "near" },
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 1],
            [10, 1],
          ],
        },
      },
      {
        properties: { slug: "near" },
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 2],
            [10, 2],
          ],
        },
      },
    ]);
    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Test Park"
        linkedTrails={[mockLinkedTrail]}
        linkedAreas={[
          { id: 8, slug: "langinkoski", name: "Langinkoski", boundaryGeoJson: mockBoundaryGeoJson },
        ]}
        onPick={onPick}
        onPreview={onPreview}
      />,
      { wrapper: I18nProvider },
    );
    const click = mockMap.on.mock.calls.find(
      ([event]) => event === "click",
    )?.[1] as unknown as (event: { point: { x: number; y: number } }) => void;
    const move = mockMap.on.mock.calls.find(
      ([event]) => event === "mousemove",
    )?.[1] as unknown as (event: { point: { x: number; y: number } }) => void;
    const areaHit = [
      { properties: { slug: "langinkoski" }, geometry: { type: "Polygon", coordinates: [] } },
    ];
    mockMap.queryRenderedFeatures.mockReturnValueOnce(areaHit);
    act(() => move({ point: { x: 5, y: 0 } }));
    expect(onPreview).toHaveBeenCalledWith("near");
    act(() => click({ point: { x: 5, y: 4 } }));
    expect(onPick).toHaveBeenCalledWith("near");
    mockMap.queryRenderedFeatures.mockReturnValueOnce(areaHit);
    act(() => move({ point: { x: 5, y: 8 } }));
    expect(onPreview).toHaveBeenLastCalledWith("langinkoski");
    act(() => click({ point: { x: 5, y: 8 } }));
    expect(onPick).toHaveBeenLastCalledWith("langinkoski");
  });

  it("clears the hover label on Escape and removes map layers when trails change", () => {
    const onPreview = vi.fn();
    mockMap.queryRenderedFeatures = vi.fn(() => [
      {
        properties: { slug: "pitka-reitti" },
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [10, 0],
          ],
        },
      },
    ]);
    const props = {
      boundaryGeoJson: mockBoundaryGeoJson,
      boundingBox: mockBoundingBox,
      markerPoint: mockMarkerPoint,
      parkName: "Test Park",
      onPreview,
    };
    const { rerender } = render(<ParkBoundaryMap {...props} linkedTrails={[mockLinkedTrail]} />, {
      wrapper: I18nProvider,
    });
    const move = mockMap.on.mock.calls.find(([event]) => event === "mousemove")?.[1] as unknown as (
      event: unknown,
    ) => void;
    act(() => move({ point: { x: 5, y: 0 } }));
    expect(screen.getByText("Pitkä reitti · 42 km")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Pitkä reitti · 42 km")).not.toBeInTheDocument();
    expect(onPreview).toHaveBeenLastCalledWith(null);
    rerender(<ParkBoundaryMap {...props} linkedTrails={[]} />);
    expect(mockMap.removeLayer).toHaveBeenCalledWith("park-trails-active-line");
    expect(mockMap.removeSource).toHaveBeenCalledWith("park-trails");
  });

  it.each([
    { lengthKm: null, expected: "Pitkä reitti" },
    { lengthKm: 0, expected: "Pitkä reitti" },
    { lengthKm: undefined, expected: "Pitkä reitti" },
    { lengthKm: 2.5, expected: "Pitkä reitti · 2,5 km" },
  ])("formats the hover label for length $lengthKm", ({ lengthKm, expected }) => {
    mockMap.queryRenderedFeatures = vi.fn(() => [
      {
        properties: { slug: "pitka-reitti" },
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [10, 0],
          ],
        },
      },
    ]);
    const trail = { ...mockLinkedTrail, lengthKm } as typeof mockLinkedTrail;
    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Test Park"
        linkedTrails={[trail]}
      />,
      { wrapper: I18nProvider },
    );
    const move = mockMap.on.mock.calls.find(([event]) => event === "mousemove")?.[1] as unknown as (
      event: unknown,
    ) => void;
    act(() => move({ point: { x: 5, y: 0 } }));
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("selects a trail on touch, and ignores drags and generated clicks", () => {
    const onPick = vi.fn();
    mockMap.queryRenderedFeatures = vi.fn(() => [
      {
        properties: { slug: "pitka-reitti" },
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [10, 0],
          ],
        },
      },
    ]);
    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Test Park"
        linkedTrails={[mockLinkedTrail]}
        onPick={onPick}
      />,
      { wrapper: I18nProvider },
    );
    const start = mockMap.on.mock.calls.find(
      ([event]) => event === "touchstart",
    )?.[1] as unknown as (event: unknown) => void;
    const end = mockMap.on.mock.calls.find(([event]) => event === "touchend")?.[1] as unknown as (
      event: unknown,
    ) => void;
    const click = mockMap.on.mock.calls.find(([event]) => event === "click")?.[1] as unknown as (
      event: unknown,
    ) => void;
    act(() => {
      start({ points: [{ x: 5, y: 0 }] });
      end({ originalEvent: { changedTouches: [{ clientX: 5, clientY: 0 }] } });
      click({ point: { x: 5, y: 0 } });
    });
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith("pitka-reitti");
    act(() => {
      start({ points: [{ x: 5, y: 0 }] });
      end({ originalEvent: { changedTouches: [{ clientX: 30, clientY: 0 }] } });
    });
    act(() => {
      start({
        points: [
          { x: 5, y: 0 },
          { x: 8, y: 0 },
        ],
      });
      end({ originalEvent: { changedTouches: [{ clientX: 5, clientY: 0 }] } });
    });
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it("removes the old boundary layers and source when park geometry changes", () => {
    const props = {
      boundaryGeoJson: mockBoundaryGeoJson,
      boundingBox: mockBoundingBox,
      markerPoint: mockMarkerPoint,
      parkName: "Test Park",
    };
    const { rerender } = render(<ParkBoundaryMap {...props} />, { wrapper: I18nProvider });
    mockMap.getLayer.mockReturnValue({});
    mockMap.getSource.mockReturnValue({});
    rerender(<ParkBoundaryMap {...props} boundaryGeoJson={{ ...mockBoundaryGeoJson }} />);
    expect(mockMap.removeLayer).toHaveBeenCalledWith("park-boundary-fill");
    expect(mockMap.removeLayer).toHaveBeenCalledWith("park-boundary-outline");
    expect(mockMap.removeSource).toHaveBeenCalledWith("park-boundary");
  });

  it("renders map container with accessible label", () => {
    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Test Park"
      />,
      { wrapper: I18nProvider },
    );
    expect(
      screen.getByRole("application", { name: "Test Park rajaus kartalla" }),
    ).toBeInTheDocument();
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
      { wrapper: I18nProvider },
    );
    expect(screen.getByText("Ladataan karttaa...")).toBeInTheDocument();
  });

  it("allows zooming out three levels from the fitted park bounds", () => {
    render(
      <ParkBoundaryMap
        boundaryGeoJson={mockBoundaryGeoJson}
        boundingBox={mockBoundingBox}
        markerPoint={mockMarkerPoint}
        parkName="Test Park"
      />,
      { wrapper: I18nProvider },
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
      { wrapper: I18nProvider },
    );

    expect(mockMap.setMinZoom).toHaveBeenCalledWith(3);
  });
});
