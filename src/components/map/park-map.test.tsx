import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FilterableMapPark } from "@/lib/parks";
import { ParkMap } from "./park-map";

const loadHandlers: Array<() => void> = [];
const markerElements: HTMLElement[] = [];
const resizeObservers: MockResizeObserver[] = [];
const popupInstances: Array<{
  addTo: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  setDOMContent: ReturnType<typeof vi.fn>;
}> = [];
let mapOptions: Record<string, unknown> | null = null;
const fitBoundsMock = vi.fn();
const easeToMock = vi.fn();

const parks: FilterableMapPark[] = [
  {
    slug: "pallas",
    name: "Pallas-Yllästunturin kansallispuisto",
    areaKm2: 1020,
    address: "Pallasjärventie 14, 99300 Muonio",
    logo: {
      key: "pallas-logo.png",
      updatedAt: "2024-01-01T00:00:00Z",
      url: "https://example.com/pallas-logo.png",
    },
    parkUrl: "https://example.com/pallas",
    map: {
      key: "pallas-map.pdf",
      updatedAt: "2024-01-01T00:00:00Z",
      url: "https://example.com/pallas-map.pdf",
    },
    category: { name: "Kansallispuistot", slug: "national-park" },
    establishmentYear: 1938,
    locationLabel: "Pallasjärventie 14",
    boundingBox: { minLat: 67, minLon: 23, maxLat: 68, maxLon: 24 },
    markerPoint: { lat: 67.5, lon: 23.5 },
    postalCode: "99300",
    postalOffice: "Muonio",
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
    visitedSummary: { visited: false, visitCount: 0, lastVisitedOn: null },
  },
  {
    slug: "hetta",
    name: "Hetta",
    displayTypeName: "Maailmanperintökohde",
    areaKm2: 10,
    address: "Hettantie 1, 99400 Enontekiö",
    logo: null,
    parkUrl: null,
    map: null,
    category: { name: "Muut LS-alueet", slug: "nature-reserve-area" },
    establishmentYear: null,
    locationLabel: "Hettantie 1",
    boundingBox: { minLat: 67.1, minLon: 23.1, maxLat: 67.2, maxLon: 23.2 },
    markerPoint: { lat: 67.15, lon: 23.15 },
    postalCode: "99400",
    postalOffice: "Enontekiö",
    type: { code: 4, id: 4, name: "Muu luonnonsuojelualue", slug: "nature-reserve-area" },
    visitedSummary: { visited: false, visitCount: 0, lastVisitedOn: null },
  },
];

const triggerMapLoad = () => {
  act(() => {
    for (const handler of loadHandlers.splice(0)) {
      handler();
    }
  });
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
    }),
    getElement: vi.fn(() => content),
  };

  popup.setLngLat.mockReturnThis();
  popupInstances.push(popup);
  return popup;
};

const createMockMarker = (options?: { element?: HTMLElement }) => {
  const element = options?.element ?? document.createElement("button");
  markerElements.push(element);

  const marker = {
    setLngLat: vi.fn(),
    addTo: vi.fn(),
    remove: vi.fn(),
    getElement: vi.fn(() => element),
  };

  marker.setLngLat.mockReturnThis();
  marker.addTo.mockReturnThis();
  return marker;
};

const createMockMap = () => ({
  on: vi.fn((event: string, handler: () => void) => {
    if (event === "load") {
      loadHandlers.push(handler);
    }
  }),
  remove: vi.fn(),
  resize: vi.fn(),
  addControl: vi.fn(),
  fitBounds: fitBoundsMock,
  easeTo: easeToMock,
});

class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();

  constructor() {
    resizeObservers.push(this);
  }
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

vi.mock("maplibre-gl", () => ({
  // biome-ignore lint: Vitest v4 constructor mocks must be constructible.
  Map: vi.fn(function (options?: Record<string, unknown>) {
    mapOptions = options ?? null;
    return createMockMap();
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
  setWorkerUrl: vi.fn(),
}));

describe("ParkMap", () => {
  beforeEach(() => {
    loadHandlers.length = 0;
    markerElements.length = 0;
    popupInstances.length = 0;
    resizeObservers.length = 0;
    mapOptions = null;
    fitBoundsMock.mockReset();
    easeToMock.mockReset();
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("renders map container with accessible label", () => {
    render(<ParkMap parks={[]} />);
    expect(screen.getByRole("application", { name: "map.ariaLabel" })).toBeInTheDocument();
  });

  it("shows loading spinner before map is loaded", () => {
    render(<ParkMap parks={[]} />);
    expect(screen.getByText("map.loading")).toBeInTheDocument();
  });

  it("initializes the map against Finland bounds and observes container resizes", () => {
    render(<ParkMap parks={[]} />);

    expect(mapOptions).toMatchObject({
      bounds: [
        [19.0, 59.5],
        [32.0, 70.5],
      ],
      fitBoundsOptions: {
        duration: 0,
        padding: 24,
      },
    });
    expect(resizeObservers).toHaveLength(1);
    expect(resizeObservers[0]?.observe).toHaveBeenCalledTimes(1);
  });

  it("initializes the map against the current filtered park bounds on first load", () => {
    render(<ParkMap parks={[parks[0], parks[1]].filter(Boolean)} />);

    expect(mapOptions).toMatchObject({
      bounds: [
        [23, 67],
        [24, 68],
      ],
      fitBoundsOptions: {
        duration: 0,
        padding: {
          top: 104,
          right: 48,
          bottom: 48,
          left: 48,
        },
      },
    });
  });

  it("displays error message when error prop is provided", () => {
    render(<ParkMap parks={[]} error="API error" />);
    expect(screen.getByText("map.loadError")).toBeInTheDocument();
    expect(screen.getByText("API error")).toBeInTheDocument();
  });

  it("does not show loading spinner when error is present", () => {
    render(<ParkMap parks={[]} error="API error" />);
    expect(screen.queryByText("map.loading")).not.toBeInTheDocument();
  });

  it("renders a current location button for the shared map", () => {
    render(<ParkMap parks={[]} />);

    expect(screen.getByRole("button", { name: "map.locateUser" })).toBeDisabled();

    triggerMapLoad();

    expect(screen.getByRole("button", { name: "map.locateUser" })).toBeEnabled();
  });

  it("shows the park logo in the popup when a logo exists", () => {
    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(markerElements[0]);

    const logo = document.querySelector('img[src="https://example.com/pallas-logo.png"]');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveClass("h-12", "w-auto");
  });

  it("builds popup content only when a park popup is first shown", () => {
    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    // Building popup DOM eagerly would also fetch every park logo up front.
    for (const popup of popupInstances) {
      expect(popup.setDOMContent).not.toHaveBeenCalled();
    }

    fireEvent.click(markerElements[0]);

    const contentCalls = popupInstances.flatMap((popup) => popup.setDOMContent.mock.calls);
    expect(contentCalls).toHaveLength(1);
    const contentNode = contentCalls[0][0] as HTMLElement;
    expect(
      contentNode.querySelector('img[src="https://example.com/pallas-logo.png"]'),
    ).not.toBeNull();
  });

  it("does not show a logo in the popup when the park has no logo", () => {
    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(markerElements[1]);

    expect(
      document.querySelector('img[src="https://example.com/pallas-logo.png"]'),
    ).not.toBeInTheDocument();
    expect(document.body).toHaveTextContent("Hetta");
  });

  it("closes a hover preview after the leave delay", async () => {
    vi.useFakeTimers();

    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.mouseEnter(markerElements[0]);
    expect(document.body).toHaveTextContent("Pallas-Yllästunturin kansallispuisto");

    fireEvent.mouseLeave(markerElements[0]);
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(document.querySelector(".maplibregl-popup")).not.toBeInTheDocument();
  });

  it("keeps a clicked popup locked when hovering another marker", async () => {
    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.mouseEnter(markerElements[0]);
    expect(document.body).toHaveTextContent("Pallas-Yllästunturin kansallispuisto");

    fireEvent.click(markerElements[0]);
    fireEvent.mouseEnter(markerElements[1]);

    expect(document.body).toHaveTextContent("Pallas-Yllästunturin kansallispuisto");
    expect(document.body).not.toHaveTextContent("Hetta");
  });

  it("zooms toward a park when a marker is activated", () => {
    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(markerElements[0]);

    expect(fitBoundsMock).toHaveBeenCalledWith(
      [
        [23, 67],
        [24, 68],
      ],
      expect.objectContaining({
        duration: 1200,
        maxZoom: 11,
      }),
    );
  });

  it("opens the popup when a marker is clicked without hovering first", () => {
    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(markerElements[0]);

    expect(document.body).toHaveTextContent("Pallas-Yllästunturin kansallispuisto");
    expect(screen.getByRole("link", { name: "map.openParkPage" })).toHaveAttribute(
      "href",
      "/paikka/pallas",
    );
  });

  it("uses the custom display type name in map labels when available", () => {
    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    expect(markerElements[1]).toHaveAttribute("aria-label", "Hetta, Maailmanperintökohde");

    fireEvent.click(markerElements[1]);

    expect(document.body).toHaveTextContent("Maailmanperintökohde");
    expect(document.body).not.toHaveTextContent("Muu luonnonsuojelualue");
  });

  it("renders custom display type names as text instead of executable markup", () => {
    const hostileParks: FilterableMapPark[] = [
      {
        ...parks[1],
        displayTypeName: '<script data-testid="injected-script">bad()</script>Turvallinen nimi',
      },
    ];

    render(<ParkMap parks={hostileParks} />);
    triggerMapLoad();

    fireEvent.click(markerElements[0]);

    expect(document.querySelector('[data-testid="injected-script"]')).not.toBeInTheDocument();
    expect(document.body).toHaveTextContent(
      '<script data-testid="injected-script">bad()</script>Turvallinen nimi',
    );
  });

  it("activates a park from an external home search focus request", () => {
    const { rerender } = render(<ParkMap parks={parks} />);
    triggerMapLoad();

    rerender(
      <ParkMap
        parks={parks}
        homeParkFocusRequest={{
          requestId: 1,
          slug: "hetta",
        }}
      />,
    );

    expect(fitBoundsMock).toHaveBeenCalledWith(
      [
        [23.1, 67.1],
        [23.2, 67.2],
      ],
      expect.objectContaining({
        duration: 1200,
        maxZoom: 11,
      }),
    );
    expect(document.body).toHaveTextContent("Hetta");
  });

  it("requests a fast current position suitable for map centering and focuses on success", () => {
    const getCurrentPositionMock = vi.fn(
      (
        onSuccess: PositionCallback,
        _onError?: PositionErrorCallback | null,
        _options?: PositionOptions,
      ) => {
        onSuccess({
          coords: {
            accuracy: 15,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            latitude: 60.192059,
            longitude: 24.945831,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        });
      },
    );

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: getCurrentPositionMock,
      },
    });

    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(screen.getByRole("button", { name: "map.locateUser" }));

    expect(getCurrentPositionMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 10000,
      }),
    );
    expect(easeToMock).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [24.945831, 60.192059],
        duration: 900,
        zoom: 9,
      }),
    );
    expect(
      screen.getByRole("button", {
        name: "map.showFilteredParks",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("turns off location mode instead of requesting geolocation again on a second click", () => {
    const getCurrentPositionMock = vi.fn(
      (
        onSuccess: PositionCallback,
        _onError?: PositionErrorCallback | null,
        _options?: PositionOptions,
      ) => {
        onSuccess({
          coords: {
            accuracy: 15,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            latitude: 60.192059,
            longitude: 24.945831,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        });
      },
    );

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: getCurrentPositionMock,
      },
    });

    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    const locateButton = screen.getByRole("button", { name: "map.locateUser" });
    fireEvent.click(locateButton);
    fireEvent.click(screen.getByRole("button", { name: "map.showFilteredParks" }));

    expect(getCurrentPositionMock).toHaveBeenCalledTimes(1);
  });

  it("does not reset the map view while location mode is active", () => {
    const getCurrentPositionMock = vi.fn(
      (
        onSuccess: PositionCallback,
        _onError?: PositionErrorCallback | null,
        _options?: PositionOptions,
      ) => {
        onSuccess({
          coords: {
            accuracy: 15,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            latitude: 60.192059,
            longitude: 24.945831,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        });
      },
    );

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: getCurrentPositionMock,
      },
    });

    const { rerender } = render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(screen.getByRole("button", { name: "map.locateUser" }));

    rerender(<ParkMap parks={[parks[1]]} resetViewRequestId={1} />);

    expect(fitBoundsMock).not.toHaveBeenCalled();
    expect(easeToMock).toHaveBeenCalledTimes(1);
  });

  it("returns to the current filtered park bounds when location mode is turned off", () => {
    const getCurrentPositionMock = vi.fn(
      (
        onSuccess: PositionCallback,
        _onError?: PositionErrorCallback | null,
        _options?: PositionOptions,
      ) => {
        onSuccess({
          coords: {
            accuracy: 15,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            latitude: 60.192059,
            longitude: 24.945831,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        });
      },
    );

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: getCurrentPositionMock,
      },
    });

    const { rerender } = render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(screen.getByRole("button", { name: "map.locateUser" }));

    rerender(<ParkMap parks={[parks[1]]} resetViewRequestId={1} />);

    fireEvent.click(screen.getByRole("button", { name: "map.showFilteredParks" }));

    expect(getCurrentPositionMock).toHaveBeenCalledTimes(1);
    expect(fitBoundsMock).toHaveBeenCalledWith(
      [
        [23.1, 67.1],
        [23.2, 67.2],
      ],
      expect.objectContaining({
        duration: 800,
        maxZoom: 11,
        padding: {
          top: 104,
          right: 48,
          bottom: 48,
          left: 48,
        },
      }),
    );
    expect(screen.getByRole("button", { name: "map.locateUser" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("shows a locating status and disables the button while waiting for geolocation", () => {
    let successCallback: PositionCallback | null = null;

    const getCurrentPositionMock = vi.fn(
      (
        onSuccess: PositionCallback,
        _onError?: PositionErrorCallback | null,
        _options?: PositionOptions,
      ) => {
        successCallback = onSuccess;
      },
    );

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: getCurrentPositionMock,
      },
    });

    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    const locateButton = screen.getByRole("button", { name: "map.locateUser" });
    fireEvent.click(locateButton);

    expect(locateButton).toBeDisabled();
    expect(screen.getByText("map.locating")).toBeInTheDocument();

    act(() => {
      successCallback?.({
        coords: {
          accuracy: 15,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 60.192059,
          longitude: 24.945831,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      });
    });

    expect(locateButton).toBeEnabled();
    expect(screen.queryByText("map.locating")).not.toBeInTheDocument();
  });

  it("shows a permission error when location access is denied", () => {
    const getCurrentPositionMock = vi.fn(
      (_onSuccess: PositionCallback, onError?: PositionErrorCallback | null) => {
        onError?.({
          code: 1,
          message: "permission denied",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      },
    );

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: getCurrentPositionMock,
      },
    });

    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(screen.getByRole("button", { name: "map.locateUser" }));

    expect(screen.getByText("map.locationPermissionDenied")).toBeInTheDocument();
  });

  it("shows an unsupported message when the browser cannot provide geolocation", () => {
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });

    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(screen.getByRole("button", { name: "map.locateUser" }));

    expect(screen.getByText("map.locationUnsupported")).toBeInTheDocument();
  });

  it("shows a timeout message when geolocation times out", () => {
    const getCurrentPositionMock = vi.fn(
      (_onSuccess: PositionCallback, onError?: PositionErrorCallback | null) => {
        onError?.({
          code: 3,
          message: "timed out",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      },
    );

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: getCurrentPositionMock,
      },
    });

    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(screen.getByRole("button", { name: "map.locateUser" }));

    expect(screen.getByText("map.locationTimeout")).toBeInTheDocument();
  });

  it("shows a generic unavailable message when geolocation fails without a specific status", () => {
    const getCurrentPositionMock = vi.fn(
      (_onSuccess: PositionCallback, onError?: PositionErrorCallback | null) => {
        onError?.({
          code: 999,
          message: "unknown",
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      },
    );

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: getCurrentPositionMock,
      },
    });

    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(screen.getByRole("button", { name: "map.locateUser" }));

    expect(screen.getByText("map.locationUnavailable")).toBeInTheDocument();
  });

  it("keeps the focused popup visible when the marker layer refreshes", () => {
    const { rerender } = render(
      <ParkMap
        parks={parks}
        canManageVisits={false}
        homeParkFocusRequest={{
          requestId: 1,
          slug: "hetta",
        }}
      />,
    );
    triggerMapLoad();

    expect(document.body).toHaveTextContent("Hetta");

    rerender(
      <ParkMap
        parks={parks}
        canManageVisits
        homeParkFocusRequest={{
          requestId: 1,
          slug: "hetta",
        }}
      />,
    );

    expect(document.body).toHaveTextContent("Hetta");
  });

  it("keeps the active popup visible when parks change but the active slug is still present", () => {
    const { rerender } = render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(markerElements[0]);
    expect(document.body).toHaveTextContent("Pallas-Yllästunturin kansallispuisto");

    rerender(<ParkMap parks={[parks[0]]} />);

    expect(document.body).toHaveTextContent("Pallas-Yllästunturin kansallispuisto");
  });

  it("fits the currently visible parks when the filter requests a map reset", () => {
    const { rerender } = render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(markerElements[0]);
    expect(document.body).toHaveTextContent("Pallas-Yllästunturin kansallispuisto");

    rerender(<ParkMap parks={[parks[1], parks[0]].filter(Boolean)} resetViewRequestId={1} />);

    expect(fitBoundsMock).toHaveBeenLastCalledWith(
      [
        [23, 67],
        [24, 68],
      ],
      expect.objectContaining({
        duration: 800,
        maxZoom: 11,
        padding: {
          top: 104,
          right: 48,
          bottom: 48,
          left: 48,
        },
      }),
    );
    expect(document.querySelector(".maplibregl-popup")).not.toBeInTheDocument();
  });

  it("falls back to the Finland overview when a reset is requested without visible parks", () => {
    const { rerender } = render(<ParkMap parks={parks} />);
    triggerMapLoad();

    rerender(<ParkMap parks={[]} resetViewRequestId={1} />);

    expect(easeToMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        center: [25.5, 65],
        duration: 800,
        zoom: 4,
      }),
    );
    expect(fitBoundsMock).not.toHaveBeenCalledWith(
      [
        [19.0, 59.5],
        [32.0, 70.5],
      ],
      expect.anything(),
    );
  });

  it("returns to the Finland overview when location mode is turned off without visible parks", () => {
    const getCurrentPositionMock = vi.fn(
      (
        onSuccess: PositionCallback,
        _onError?: PositionErrorCallback | null,
        _options?: PositionOptions,
      ) => {
        onSuccess({
          coords: {
            accuracy: 15,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            latitude: 60.192059,
            longitude: 24.945831,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        });
      },
    );

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: getCurrentPositionMock,
      },
    });

    const { rerender } = render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(screen.getByRole("button", { name: "map.locateUser" }));
    rerender(<ParkMap parks={[]} resetViewRequestId={1} />);

    fireEvent.click(screen.getByRole("button", { name: "map.showFilteredParks" }));

    expect(easeToMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        center: [25.5, 65],
        duration: 800,
        zoom: 4,
      }),
    );
  });

  it("clears an active popup when the filtered park disappears", () => {
    const { rerender } = render(<ParkMap parks={parks} />);
    triggerMapLoad();
    const [, remainingPark] = parks;

    fireEvent.click(markerElements[0]);
    expect(document.body).toHaveTextContent("Pallas-Yllästunturin kansallispuisto");

    if (!remainingPark) {
      throw new Error("Expected a remaining park for the filtered rerender test");
    }

    rerender(<ParkMap parks={[remainingPark]} />);
    expect(document.querySelector(".maplibregl-popup")).not.toBeInTheDocument();

    rerender(<ParkMap parks={parks} />);
    expect(document.body).not.toHaveTextContent("Pallas-Yllästunturin kansallispuisto");
  });

  it("shows a PDF brochure link in the popup when a map is available", () => {
    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.mouseEnter(markerElements[0]);

    expect(screen.getByRole("link", { name: "map.pdfBrochure" })).toHaveAttribute(
      "href",
      "https://example.com/pallas-map.pdf",
    );
  });

  it("shows an add visit link in the popup when visit management is enabled", () => {
    render(<ParkMap parks={parks} canManageVisits />);
    triggerMapLoad();

    fireEvent.mouseEnter(markerElements[0]);

    expect(screen.getByRole("link", { name: "map.openParkPage" })).toHaveAttribute(
      "href",
      "/paikka/pallas",
    );
    expect(screen.getByRole("link", { name: "map.addVisit" })).toHaveAttribute(
      "href",
      "/hallinta/kaynnit/uusi?park=pallas",
    );
  });

  it("closes an active popup when clicking on the map canvas outside markers and popups", () => {
    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(markerElements[0]);
    expect(document.body).toHaveTextContent("Pallas-Yllästunturin kansallispuisto");

    const mapContainer = screen.getByRole("application", { name: "map.ariaLabel" });
    fireEvent.mouseDown(mapContainer);

    expect(document.querySelector(".maplibregl-popup")).not.toBeInTheDocument();
  });

  it("does not close an active popup when clicking outside the map container", () => {
    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(markerElements[0]);
    expect(document.body).toHaveTextContent("Pallas-Yllästunturin kansallispuisto");

    fireEvent.mouseDown(document.body);

    expect(document.querySelector(".maplibregl-popup")).toBeInTheDocument();
  });

  it("closes an active popup when pressing escape", () => {
    render(<ParkMap parks={parks} />);
    triggerMapLoad();

    fireEvent.click(markerElements[0]);
    expect(document.body).toHaveTextContent("Pallas-Yllästunturin kansallispuisto");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(document.querySelector(".maplibregl-popup")).not.toBeInTheDocument();
  });

  it("notifies parent when active slug changes via marker click", () => {
    const onActiveSlugChange = vi.fn();
    render(<ParkMap parks={parks} onActiveSlugChange={onActiveSlugChange} />);
    triggerMapLoad();

    fireEvent.click(markerElements[0]);
    expect(onActiveSlugChange).toHaveBeenCalledWith("pallas");

    fireEvent.click(markerElements[0]);
    expect(onActiveSlugChange).toHaveBeenCalledWith(null);
  });

  it("renders removed park markers with red color in admin mode", () => {
    render(
      <ParkMap
        parks={parks}
        removedSlugs={new Set(["pallas"])}
        onToggleRemoved={vi.fn()}
        toggleLabels={{ hide: "Piilota sovelluksesta", show: "Näytä sovelluksessa" }}
      />,
    );
    triggerMapLoad();

    const svg = markerElements[0].querySelector("svg");
    expect(svg).toHaveAttribute("fill", "#ef4444");
  });

  it("renders visible park markers with green color in admin mode", () => {
    render(
      <ParkMap
        parks={parks}
        removedSlugs={new Set()}
        onToggleRemoved={vi.fn()}
        toggleLabels={{ hide: "Piilota sovelluksesta", show: "Näytä sovelluksessa" }}
      />,
    );
    triggerMapLoad();

    const svg = markerElements[0].querySelector("svg");
    expect(svg).toHaveAttribute("fill", "#16a34a");
  });

  it("shows a hide button in popup for visible parks when admin toggle is enabled", () => {
    render(
      <ParkMap
        parks={parks}
        removedSlugs={new Set()}
        onToggleRemoved={vi.fn()}
        toggleLabels={{ hide: "Piilota sovelluksesta", show: "Näytä sovelluksessa" }}
      />,
    );
    triggerMapLoad();

    fireEvent.click(markerElements[0]);

    expect(screen.getByRole("button", { name: "Piilota sovelluksesta" })).toBeInTheDocument();
  });

  it("shows a show button in popup for removed parks when admin toggle is enabled", () => {
    render(
      <ParkMap
        parks={parks}
        removedSlugs={new Set(["pallas"])}
        onToggleRemoved={vi.fn()}
        toggleLabels={{ hide: "Piilota sovelluksesta", show: "Näytä sovelluksessa" }}
      />,
    );
    triggerMapLoad();

    fireEvent.click(markerElements[0]);

    expect(screen.getByRole("button", { name: "Näytä sovelluksessa" })).toBeInTheDocument();
  });

  it("keeps the park page link available in the admin popup", () => {
    render(
      <ParkMap
        parks={parks}
        removedSlugs={new Set(["pallas"])}
        onToggleRemoved={vi.fn()}
        toggleLabels={{ hide: "Piilota sovelluksesta", show: "Näytä sovelluksessa" }}
      />,
    );
    triggerMapLoad();

    fireEvent.click(markerElements[0]);

    expect(screen.getByRole("link", { name: "map.openParkPage" })).toHaveAttribute(
      "href",
      "/paikka/pallas",
    );
  });

  it("calls onToggleRemoved when the popup toggle button is clicked", () => {
    const onToggleRemoved = vi.fn();
    render(
      <ParkMap
        parks={parks}
        removedSlugs={new Set()}
        onToggleRemoved={onToggleRemoved}
        toggleLabels={{ hide: "Piilota sovelluksesta", show: "Näytä sovelluksessa" }}
      />,
    );
    triggerMapLoad();

    fireEvent.click(markerElements[0]);

    const toggleBtn = screen.getByRole("button", { name: "Piilota sovelluksesta" });
    fireEvent.click(toggleBtn);

    expect(onToggleRemoved).toHaveBeenCalledWith("pallas", true);
  });
});
