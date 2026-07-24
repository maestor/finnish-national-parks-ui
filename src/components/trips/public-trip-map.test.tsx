import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicTripDetail, PublicTripRoute } from "@/lib/trips";
import { PublicTripMap } from "./public-trip-map";

interface MockMarker {
  addTo: ReturnType<typeof vi.fn>;
  element: HTMLElement;
  remove: ReturnType<typeof vi.fn>;
  setLngLat: ReturnType<typeof vi.fn>;
  wrapper: HTMLElement;
}

const markerInstances: MockMarker[] = [];

const createMockMarker = (options?: { element?: HTMLElement }) => {
  const element = options?.element ?? document.createElement("div");
  const wrapper = document.createElement("div");
  wrapper.className = "maplibregl-marker";
  wrapper.appendChild(element);

  const marker: MockMarker = {
    element,
    wrapper,
    setLngLat: vi.fn().mockReturnThis(),
    addTo: vi.fn(() => {
      document.body.appendChild(wrapper);
      return marker;
    }),
    remove: vi.fn(() => {
      wrapper.remove();
    }),
  };

  markerInstances.push(marker);
  return marker;
};

const createMockPopup = () => {
  const content = document.createElement("div");
  content.className = "maplibregl-popup-content";
  const wrapper = document.createElement("div");
  wrapper.className = "maplibregl-popup";
  wrapper.appendChild(content);

  const popup = {
    setLngLat: vi.fn(),
    setDOMContent: vi.fn((node: HTMLElement) => {
      content.replaceChildren(node);
      return popup;
    }),
    addTo: vi.fn(() => {
      document.body.appendChild(wrapper);
      return popup;
    }),
    remove: vi.fn(() => {
      wrapper.remove();
      return popup;
    }),
  };

  popup.setLngLat.mockReturnThis();
  return popup;
};

const createMockMap = ({
  autoLoad = true,
  initialLayerExists = false,
  initialSourceExists = false,
} = {}) => {
  const listeners: Record<string, Array<() => void>> = {};
  let sourceExists = initialSourceExists;
  let layerExists = initialLayerExists;
  const source = {
    setData: vi.fn(),
  };

  return {
    trigger: (event: string) => {
      for (const handler of listeners[event] ?? []) {
        handler();
      }
    },
    on: vi.fn((event: string, handler: () => void) => {
      listeners[event] ??= [];
      listeners[event]?.push(handler);

      if (event === "load" && autoLoad) {
        handler();
      }
    }),
    remove: vi.fn(),
    resize: vi.fn(),
    addControl: vi.fn(),
    addLayer: vi.fn(() => {
      layerExists = true;
    }),
    addSource: vi.fn(() => {
      sourceExists = true;
    }),
    getLayer: vi.fn(() => (layerExists ? {} : undefined)),
    getSource: vi.fn(() => (sourceExists ? source : undefined)),
    removeLayer: vi.fn(() => {
      layerExists = false;
    }),
    removeSource: vi.fn(() => {
      sourceExists = false;
    }),
    fitBounds: vi.fn(),
    source,
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
  Marker: vi.fn(function (options?: { element?: HTMLElement }) {
    return createMockMarker(options);
  }),
  // biome-ignore lint: Vitest v4 constructor mocks must be constructible.
  Popup: vi.fn(function () {
    return createMockPopup();
  }),
  // biome-ignore lint: Vitest v4 constructor mocks must be constructible.
  NavigationControl: vi.fn(function () {
    return {};
  }),
  setWorkerUrl: vi.fn(),
}));

const route: PublicTripRoute = {
  distanceMeters: 880_000,
  durationSeconds: 36_000,
  geometry: {
    type: "LineString",
    coordinates: [
      [24.9384, 60.1699],
      [25.0, 62.0],
      [24.9384, 60.1699],
    ],
  },
  returnsToStart: true,
  waypointCount: 4,
};

const startingPoint: NonNullable<PublicTripDetail["startingPoint"]> = {
  displayName: "Helsinki",
  label: "Helsinki",
  coordinate: {
    lat: 60.1699,
    lon: 24.9384,
  },
};

const tripStops: PublicTripDetail["itinerary"] = [
  {
    kind: "visit",
    tripStopOrder: 1,
    visit: {
      id: 11,
      author: null,
      createdAt: "2024-06-15T10:00:00Z",
      excludeFromRoute: false,
      note: null,
      park: {
        name: "Nuuksio",
        slug: "nuuksio",
        markerPoint: {
          lat: 60.31,
          lon: 24.53,
        },
        typeLabel: "Kansallispuisto",
      },
      route: null,
      updatedAt: "2024-06-15T10:00:00Z",
      visitedOn: "2024-06-15",
      imageCount: 1,
    },
  },
  {
    kind: "visit",
    tripStopOrder: 2,
    visit: {
      id: 12,
      author: null,
      createdAt: "2024-06-15T18:00:00Z",
      excludeFromRoute: true,
      note: null,
      park: {
        name: "Ulko-Tammio",
        slug: "ulko-tammio",
        markerPoint: {
          lat: 60.52,
          lon: 27.08,
        },
        typeLabel: "Kansallispuisto",
      },
      route: null,
      updatedAt: "2024-06-15T18:00:00Z",
      visitedOn: "2024-06-15",
      imageCount: 0,
    },
  },
  {
    kind: "stop",
    tripStopOrder: 3,
    stop: {
      id: 31,
      createdAt: "2024-06-16T10:00:00Z",
      location: {
        displayName: "Yöpyminen Oulussa",
        label: "Yöpyminen Oulussa, Osoitekatu 1, Oulu, Finland",
        coordinate: {
          lat: 65.0121,
          lon: 25.4651,
        },
      },
      note: null,
      tripStopOrder: 3,
      updatedAt: "2024-06-16T10:00:00Z",
      visitedOn: "2024-06-16",
    },
  },
];

describe("PublicTripMap", () => {
  beforeEach(() => {
    markerInstances.length = 0;
    mockMap = createMockMap();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders an accessible map, draws the route, and places a starting point plus numbered itinerary markers", async () => {
    const { unmount } = render(
      <PublicTripMap
        route={route}
        startingPoint={startingPoint}
        tripName="Kesaretki"
        tripStops={tripStops}
      />,
    );

    expect(screen.getByRole("application", { name: "tripPage.mapAriaLabel" })).toBeInTheDocument();

    await waitFor(() => {
      expect(mockMap.addSource).toHaveBeenCalledWith(
        "public-trip-route",
        expect.objectContaining({
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          },
        }),
      );
    });

    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "public-trip-route-line",
        source: "public-trip-route",
        type: "line",
      }),
    );
    expect(mockMap.fitBounds).toHaveBeenCalledWith(
      [
        [24.53, 60.1699],
        [27.08, 65.0121],
      ],
      { padding: 44, duration: 0 },
    );
    expect(markerInstances).toHaveLength(4);
    expect(markerInstances[0]?.element).toHaveAttribute("title", "tripPage.startLabel");
    expect(markerInstances[1]?.element).toHaveAttribute("aria-label", "1. Nuuksio");
    expect(markerInstances[1]?.element).toHaveTextContent("1");
    expect(markerInstances[2]?.element).toHaveAttribute("aria-label", "2. Ulko-Tammio");
    expect(markerInstances[2]?.element).toHaveTextContent("2");
    expect(markerInstances[2]?.element).toHaveAttribute("data-route-excluded", "true");
    expect(markerInstances[3]?.element).toHaveAttribute("aria-label", "3. Yöpyminen Oulussa");
    expect(markerInstances[3]?.element).toHaveTextContent("3");

    unmount();

    expect(mockMap.removeLayer).toHaveBeenCalledWith("public-trip-route-line");
    expect(mockMap.removeSource).toHaveBeenCalledWith("public-trip-route");
    expect(mockMap.remove).toHaveBeenCalled();
    expect(markerInstances.every((marker) => marker.remove.mock.calls.length > 0)).toBe(true);
  });

  it("opens a visit popup with the visit link when a numbered marker is clicked", async () => {
    render(
      <PublicTripMap
        route={route}
        startingPoint={startingPoint}
        tripName="Kesaretki"
        tripStops={tripStops}
      />,
    );

    await waitFor(() => {
      expect(markerInstances).toHaveLength(4);
    });

    fireEvent.click(markerInstances[1].element);

    const popup = document.querySelector(".maplibregl-popup");

    if (!(popup instanceof HTMLElement)) {
      throw new Error("Expected an open map popup");
    }

    expect(within(popup).getByRole("heading", { name: "Nuuksio" })).toBeInTheDocument();
    expect(popup).toHaveTextContent("Kansallispuisto");
    expect(within(popup).getByRole("link", { name: "tripPage.openVisit" })).toHaveAttribute(
      "href",
      "/paikka/nuuksio?visit=11#visit-history",
    );
  });

  it("opens a popup on hover and closes it after the leave delay", async () => {
    vi.useFakeTimers();

    render(
      <PublicTripMap
        route={route}
        startingPoint={startingPoint}
        tripName="Kesaretki"
        tripStops={tripStops}
      />,
    );

    expect(markerInstances).toHaveLength(4);

    fireEvent.mouseEnter(markerInstances[3].element);
    expect(document.querySelector(".maplibregl-popup")).not.toBeNull();

    fireEvent.mouseLeave(markerInstances[3].element);

    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(document.querySelector(".maplibregl-popup")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(document.querySelector(".maplibregl-popup")).toBeNull();
  });

  it("renders only the starting point and itinerary markers when no route geometry is available", async () => {
    render(
      <PublicTripMap
        route={null}
        startingPoint={startingPoint}
        tripName="Kesaretki"
        tripStops={tripStops}
      />,
    );

    await waitFor(() => {
      expect(markerInstances).toHaveLength(4);
    });

    expect(mockMap.addSource).not.toHaveBeenCalled();
    expect(mockMap.addLayer).not.toHaveBeenCalled();
    expect(mockMap.fitBounds).toHaveBeenCalledWith(
      [
        [24.53, 60.1699],
        [27.08, 65.0121],
      ],
      { padding: 44, duration: 0 },
    );
  });

  it("shows excluded visits as non-route markers in the popup", async () => {
    render(
      <PublicTripMap
        route={route}
        startingPoint={startingPoint}
        tripName="Kesaretki"
        tripStops={tripStops}
      />,
    );

    await waitFor(() => {
      expect(markerInstances).toHaveLength(4);
    });

    fireEvent.click(markerInstances[2].element);

    const popup = document.querySelector(".maplibregl-popup");

    if (!(popup instanceof HTMLElement)) {
      throw new Error("Expected an open map popup");
    }

    expect(popup).toHaveTextContent("tripPage.excludedFromRoute");
  });

  it("reuses an existing route source and layer when they are already present", async () => {
    mockMap = createMockMap({
      initialSourceExists: true,
      initialLayerExists: true,
    });

    render(
      <PublicTripMap
        route={route}
        startingPoint={startingPoint}
        tripName="Kesaretki"
        tripStops={tripStops}
      />,
    );

    await waitFor(() => {
      expect(mockMap.source.setData).toHaveBeenCalledWith({
        type: "Feature",
        properties: {},
        geometry: route.geometry,
      });
    });

    expect(mockMap.addSource).not.toHaveBeenCalled();
    expect(mockMap.addLayer).not.toHaveBeenCalled();
  });

  it("waits for the map load event before drawing route data", async () => {
    mockMap = createMockMap({ autoLoad: false });

    render(
      <PublicTripMap
        route={route}
        startingPoint={startingPoint}
        tripName="Kesaretki"
        tripStops={tripStops}
      />,
    );

    expect(mockMap.addSource).not.toHaveBeenCalled();
    expect(mockMap.addLayer).not.toHaveBeenCalled();
    expect(markerInstances).toHaveLength(0);

    mockMap.trigger("load");

    await waitFor(() => {
      expect(mockMap.addSource).toHaveBeenCalledTimes(1);
    });
  });
});
