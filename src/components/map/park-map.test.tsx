import type { MapPark } from "@/lib/parks";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParkMap } from "./park-map";

const loadHandlers: Array<() => void> = [];
const markerElements: HTMLElement[] = [];
const popupInstances: Array<{
  addTo: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
}> = [];

const parks: MapPark[] = [
  {
    slug: "pallas",
    name: "Pallas-Yllästunturin kansallispuisto",
    areaKm2: 1020,
    locationLabel: "Lappi",
    luontoonUrl: "https://example.com/pallas",
    establishmentYear: 1938,
    boundingBox: { minLat: 67, minLon: 23, maxLat: 68, maxLon: 24 },
    markerPoint: { lat: 67.5, lon: 23.5 },
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
    visitedSummary: { visited: false },
  },
  {
    slug: "hetta",
    name: "Hetta",
    areaKm2: 10,
    locationLabel: "Lappi",
    luontoonUrl: null,
    establishmentYear: null,
    boundingBox: { minLat: 67.1, minLon: 23.1, maxLat: 67.2, maxLon: 23.2 },
    markerPoint: { lat: 67.15, lon: 23.15 },
    type: { code: 4, id: 4, name: "Muu luonnonsuojelualue", slug: "other-nature-reserve" },
    visitedSummary: { visited: false },
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
  addControl: vi.fn(),
});

vi.mock("maplibre-gl", () => ({
  default: {
    Map: vi.fn(() => createMockMap()),
    Marker: vi.fn((options?: { element?: HTMLElement }) => createMockMarker(options)),
    Popup: vi.fn(() => createMockPopup()),
    NavigationControl: vi.fn(),
  },
}));

describe("ParkMap", () => {
  beforeEach(() => {
    loadHandlers.length = 0;
    markerElements.length = 0;
    popupInstances.length = 0;
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

  it("displays error message when error prop is provided", () => {
    render(<ParkMap parks={[]} error="API error" />);
    expect(screen.getByText("map.loadError")).toBeInTheDocument();
    expect(screen.getByText("API error")).toBeInTheDocument();
  });

  it("does not show loading spinner when error is present", () => {
    render(<ParkMap parks={[]} error="API error" />);
    expect(screen.queryByText("map.loading")).not.toBeInTheDocument();
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
});
