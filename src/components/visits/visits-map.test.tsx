import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicVisitsMapMarker } from "@/lib/public-visits";
import { VisitsMap } from "./visits-map";

const loadHandlers: Array<() => void> = [];
const markerElements: HTMLElement[] = [];
const markerInstances: Array<{ remove: ReturnType<typeof vi.fn> }> = [];
const popupInstances: Array<{ remove: ReturnType<typeof vi.fn> }> = [];
let mapOptions: Record<string, unknown> | null = null;
const fitBoundsMock = vi.fn();

const markers: PublicVisitsMapMarker[] = [
  {
    slug: "nuuksio",
    name: "Nuuksio",
    coordinates: { lat: 60.3, lon: 24.5 },
    visitCount: 3,
    years: [2023, 2024],
  },
  {
    slug: "pallas-yllastunturi",
    name: "Pallas-Yllästunturi",
    coordinates: { lat: 68.1, lon: 24.0 },
    visitCount: 1,
    years: [2024],
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
  markerInstances.push(marker);
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
});

class MockResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
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
  // biome-ignore lint: Vitest v4 constructor mocks must be constructible.
  NavigationControl: vi.fn(function () {
    return {};
  }),
  setWorkerUrl: vi.fn(),
}));

describe("VisitsMap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loadHandlers.length = 0;
    markerElements.length = 0;
    markerInstances.length = 0;
    popupInstances.length = 0;
    mapOptions = null;
    fitBoundsMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a marker button per visited park with an accessible name and visit count", () => {
    render(<VisitsMap markers={markers} />);
    triggerMapLoad();

    expect(mapOptions).toMatchObject({
      bounds: [
        [24.0, 60.3],
        [24.5, 68.1],
      ],
    });

    expect(markerElements).toHaveLength(2);
    expect(markerElements[0]).toHaveAttribute("aria-label", "Nuuksio, visits.map.visitCount");
    expect(markerElements[0].querySelector("svg")).not.toBeNull();
    expect(markerElements[0]).not.toHaveTextContent("3");
    expect(markerElements[1]).toHaveAttribute(
      "aria-label",
      "Pallas-Yllästunturi, visits.map.visitCount",
    );
    expect(markerElements[1].querySelector("svg")).not.toBeNull();
    expect(markerElements[1]).not.toHaveTextContent("1");
  });

  it("opens a popup with the park name, visit details, and park link when a marker is activated", () => {
    render(<VisitsMap markers={markers} />);
    triggerMapLoad();

    fireEvent.click(markerElements[0]);

    const popup = document.querySelector(".maplibregl-popup");

    if (!(popup instanceof HTMLElement)) {
      throw new Error("Expected an open map popup");
    }

    expect(within(popup).getByRole("heading", { name: "Nuuksio" })).toBeInTheDocument();
    expect(popup).toHaveTextContent("visits.map.visitCount");
    expect(popup).toHaveTextContent("visits.map.yearsLabel: 2023, 2024");
    expect(within(popup).getByRole("link", { name: "visits.map.openParkVisits" })).toHaveAttribute(
      "href",
      "/paikka/nuuksio",
    );
  });

  it("collapses the popup details to the selected year in year-filtered mode", () => {
    render(<VisitsMap markers={markers} selectedYear={2024} />);
    triggerMapLoad();

    fireEvent.click(markerElements[0]);

    const popup = document.querySelector(".maplibregl-popup");

    if (!(popup instanceof HTMLElement)) {
      throw new Error("Expected an open map popup");
    }

    expect(popup).toHaveTextContent("visits.map.visitCountInYear");
    expect(popup).not.toHaveTextContent("visits.map.yearsLabel");
  });

  it("opens a popup on hover and closes it after the leave delay", () => {
    render(<VisitsMap markers={markers} />);
    triggerMapLoad();

    fireEvent.mouseEnter(markerElements[0]);
    expect(document.querySelector(".maplibregl-popup")).not.toBeNull();

    fireEvent.mouseLeave(markerElements[0]);
    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(document.querySelector(".maplibregl-popup")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(document.querySelector(".maplibregl-popup")).toBeNull();
  });

  it("keeps a clicked popup open when hovering away from the marker", () => {
    render(<VisitsMap markers={markers} />);
    triggerMapLoad();

    fireEvent.mouseEnter(markerElements[0]);
    fireEvent.click(markerElements[0]);
    fireEvent.mouseLeave(markerElements[0]);

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(document.querySelector(".maplibregl-popup")).not.toBeNull();
  });

  it("closes the active popup with the Escape key", () => {
    render(<VisitsMap markers={markers} />);
    triggerMapLoad();

    fireEvent.click(markerElements[0]);
    expect(document.querySelector(".maplibregl-popup")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.querySelector(".maplibregl-popup")).toBeNull();
  });

  it("keeps the popup open when a focused marker is clicked", () => {
    render(<VisitsMap markers={markers} />);
    triggerMapLoad();

    // A real pointer click focuses the button before the click event fires;
    // the popup opened by focus must survive the click.
    fireEvent.focus(markerElements[0]);
    fireEvent.click(markerElements[0]);

    expect(document.querySelector(".maplibregl-popup")).not.toBeNull();
  });

  it("removes the previous markers and popups when the filtered markers change", () => {
    const { rerender } = render(<VisitsMap markers={markers} />);
    triggerMapLoad();

    expect(markerElements).toHaveLength(2);

    rerender(<VisitsMap markers={[markers[0]]} />);

    expect(markerInstances[0].remove).toHaveBeenCalled();
    expect(markerInstances[1].remove).toHaveBeenCalled();
    expect(popupInstances[0].remove).toHaveBeenCalled();
    expect(popupInstances[1].remove).toHaveBeenCalled();
    expect(markerElements).toHaveLength(3);
    expect(markerElements[2]).toHaveAttribute("aria-label", "Nuuksio, visits.map.visitCount");
    expect(fitBoundsMock).toHaveBeenLastCalledWith(
      [
        [24.5, 60.3],
        [24.5, 60.3],
      ],
      expect.objectContaining({ maxZoom: 9 }),
    );
  });

  it("lists the same parks as accessible links below the map", () => {
    render(<VisitsMap markers={markers} />);

    const list = screen.getByRole("list");
    const links = within(list).getAllByRole("link");
    const heading = screen.getByRole("heading", { name: "visits.map.listTitle" });

    expect(heading).toBeInTheDocument();
    expect(heading.closest("section")).toHaveClass("sr-only");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/paikka/nuuksio");
    expect(links[0]).toHaveTextContent("Nuuksio");
    expect(links[0]).toHaveTextContent("visits.map.visitCount");
    expect(links[1]).toHaveAttribute("href", "/paikka/pallas-yllastunturi");
    expect(links[1]).toHaveTextContent("Pallas-Yllästunturi");
  });

  it("shows an empty state instead of the map when no parks match the filters", () => {
    render(<VisitsMap markers={[]} />);

    expect(screen.getByText("visits.map.empty")).toBeInTheDocument();
    expect(screen.queryByRole("application")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(loadHandlers).toHaveLength(0);
  });
});
