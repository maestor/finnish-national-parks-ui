import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TripPlannerRouteResult, TripPlannerUiParkResult } from "@/lib/trip-planner";
import { TripPlannerMap } from "./trip-planner-map";

interface MockMarker {
  addTo: ReturnType<typeof vi.fn>;
  element: HTMLElement;
  remove: ReturnType<typeof vi.fn>;
  setLngLat: ReturnType<typeof vi.fn>;
  wrapper: HTMLElement;
}

const markerInstances: MockMarker[] = [];

const createMockMarker = (options?: { element?: HTMLElement }): MockMarker => {
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

const createMockMap = ({ autoLoad = true } = {}) => {
  const listeners: Record<string, Array<() => void>> = {};

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
    addLayer: vi.fn(),
    addSource: vi.fn(),
    getLayer: vi.fn(() => undefined),
    getSource: vi.fn(() => undefined),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    fitBounds: vi.fn(),
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
    NavigationControl: vi.fn(),
  },
}));

const route: TripPlannerRouteResult = {
  boundingBox: {
    minLat: 60.1,
    minLon: 24.0,
    maxLat: 60.6,
    maxLon: 24.9,
  },
  distanceMeters: 100_000,
  durationSeconds: 5_400,
  geometry: {
    coordinates: [
      [24.0, 60.1],
      [24.5, 60.35],
      [24.9, 60.6],
    ],
    type: "LineString",
  },
  mode: "drive",
};

const parks: TripPlannerUiParkResult[] = [
  {
    address: "Nuuksiontie 83, 02820 Espoo",
    boundingBox: { minLat: 60.26, minLon: 24.48, maxLat: 60.35, maxLon: 24.58 },
    category: { name: "Kansallispuistot", slug: "national-park" },
    distanceKm: 4.2,
    locationLabel: "Nuuksiontie 83",
    markerPoint: { lat: 60.31, lon: 24.53 },
    name: "Nuuksion kansallispuisto",
    postalCode: "02820",
    postalOffice: "Espoo",
    slug: "nuuksio",
    type: { code: 111, id: 1, name: "Kansallispuisto", slug: "national-park" },
    visitedSummary: { lastVisitedOn: null, visitCount: 0, visited: false },
  },
  {
    address: "Hossantie 278A, 89920 Suomussalmi",
    boundingBox: { minLat: 60.02, minLon: 23.92, maxLat: 60.68, maxLon: 25.02 },
    category: { name: "Polut ja reitit", slug: "trails-and-routes" },
    distanceKm: 22.3,
    locationLabel: "Hossantie 278A",
    markerPoint: { lat: 60.62, lon: 24.96 },
    name: "Hossan polku",
    postalCode: "89920",
    postalOffice: "Suomussalmi",
    slug: "hossan-polku",
    type: { code: 220, id: 8, name: "Retkeilyreitti", slug: "hiking-trail" },
    visitedSummary: { lastVisitedOn: "2025-07-10", visitCount: 1, visited: true },
  },
];

const routeModeProps = {
  destination: { coordinate: { lat: 60.6, lon: 24.9 }, label: "Tampere" },
  distanceLabel: "tripPlanner.distanceFromRoute",
  mode: "route" as const,
  origin: { coordinate: { lat: 60.1, lon: 24.0 }, label: "Helsinki" },
  parks,
  route,
  searchArea: null,
};

describe("TripPlannerMap", () => {
  beforeEach(() => {
    markerInstances.length = 0;
    mockMap = createMockMap();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders an accessible map container", () => {
    render(<TripPlannerMap {...routeModeProps} />);

    expect(
      screen.getByRole("application", { name: "tripPlanner.map.ariaLabel" }),
    ).toBeInTheDocument();
  });

  it("renders route geometry, fits visible bounds, and places endpoint and park markers", () => {
    render(<TripPlannerMap {...routeModeProps} />);

    expect(mockMap.addSource).toHaveBeenCalledWith(
      "trip-planner-route",
      expect.objectContaining({
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: route.geometry,
        },
      }),
    );
    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "trip-planner-route-line",
        source: "trip-planner-route",
        type: "line",
      }),
    );
    expect(mockMap.fitBounds).toHaveBeenCalledWith(
      [
        [23.92, 60.02],
        [25.02, 60.68],
      ],
      expect.objectContaining({
        duration: 0,
      }),
    );
    expect(markerInstances).toHaveLength(4);
  });

  it("renders nearby results without adding route geometry", () => {
    render(
      <TripPlannerMap
        destination={null}
        distanceLabel="tripPlanner.distanceFromOrigin"
        mode="nearby"
        origin={{ coordinate: { lat: 60.1, lon: 24.0 }, label: "Helsinki" }}
        parks={parks}
        route={null}
        searchArea={{
          boundingBox: {
            minLat: 59.95,
            minLon: 23.75,
            maxLat: 60.35,
            maxLon: 24.75,
          },
          center: { lat: 60.1, lon: 24.0 },
          maxDistanceKm: 25,
        }}
      />,
    );

    expect(mockMap.addSource).not.toHaveBeenCalled();
    expect(mockMap.addLayer).not.toHaveBeenCalled();
    expect(markerInstances).toHaveLength(3);
  });

  it("opens a park popup with a park page link when a park pin is clicked", () => {
    render(<TripPlannerMap {...routeModeProps} />);

    fireEvent.click(markerInstances[2].element);

    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toHaveAttribute(
      "href",
      "/paikka/nuuksio",
    );
    expect(screen.getByRole("link", { name: "map.openParkPage" })).toHaveAttribute(
      "href",
      "/paikka/nuuksio",
    );
  });

  it("shows a loading overlay until the map load event fires", async () => {
    mockMap = createMockMap({ autoLoad: false });

    render(<TripPlannerMap {...routeModeProps} />);

    expect(screen.getByText("tripPlanner.map.loading")).toBeInTheDocument();
    expect(mockMap.addSource).not.toHaveBeenCalled();

    await act(async () => {
      mockMap.trigger("load");
    });

    await waitFor(() => {
      expect(screen.queryByText("tripPlanner.map.loading")).not.toBeInTheDocument();
    });
    expect(mockMap.addSource).toHaveBeenCalled();
  });

  it("opens a popup on hover and closes it after hover leaves", async () => {
    vi.useFakeTimers();

    render(<TripPlannerMap {...routeModeProps} />);

    fireEvent.mouseEnter(markerInstances[2].element);
    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toBeInTheDocument();

    fireEvent.mouseLeave(markerInstances[2].element);
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(
      screen.queryByRole("link", { name: "Nuuksion kansallispuisto" }),
    ).not.toBeInTheDocument();
  });

  it("closes an open popup when escape is pressed", async () => {
    render(<TripPlannerMap {...routeModeProps} />);

    fireEvent.mouseEnter(markerInstances[2].element);
    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: "Nuuksion kansallispuisto" }),
      ).not.toBeInTheDocument();
    });
  });

  it("keeps the popup open for popup clicks but closes it when the user clicks the map background", async () => {
    render(<TripPlannerMap {...routeModeProps} />);

    fireEvent.click(markerInstances[2].element);

    const popupLink = screen.getByRole("link", { name: "Nuuksion kansallispuisto" });
    fireEvent.mouseDown(popupLink);

    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("application", { name: "tripPlanner.map.ariaLabel" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: "Nuuksion kansallispuisto" }),
      ).not.toBeInTheDocument();
    });
  });

  it("clears an active popup when the matching park disappears from the result set", async () => {
    const { rerender } = render(<TripPlannerMap {...routeModeProps} />);

    fireEvent.click(markerInstances[2].element);
    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toBeInTheDocument();

    rerender(<TripPlannerMap {...routeModeProps} parks={parks.slice(1)} />);

    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: "Nuuksion kansallispuisto" }),
      ).not.toBeInTheDocument();
    });
  });

  it("updates the existing route source without re-adding the route layer", () => {
    const existingSource = {
      setData: vi.fn(),
    };
    mockMap = createMockMap();
    (mockMap.getLayer as ReturnType<typeof vi.fn>).mockReturnValue({
      id: "trip-planner-route-line",
    });
    (mockMap.getSource as ReturnType<typeof vi.fn>).mockReturnValue(existingSource);

    render(<TripPlannerMap {...routeModeProps} />);

    expect(existingSource.setData).toHaveBeenCalledWith({
      type: "Feature",
      properties: {},
      geometry: route.geometry,
    });
    expect(mockMap.addSource).not.toHaveBeenCalled();
    expect(mockMap.addLayer).not.toHaveBeenCalled();
  });
});
