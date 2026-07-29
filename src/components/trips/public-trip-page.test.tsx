import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VisitImage } from "@/lib/parks";
import { createTripItineraryItemKey } from "@/lib/public-trip-visit-details";
import type { PublicTripDetail } from "@/lib/trips";
import { PublicTripPage } from "./public-trip-page";

const authState = {
  isAuthenticated: false,
  isLoading: false,
  logout: vi.fn(),
  user: null,
};
const mockWriteText = vi.fn().mockResolvedValue(undefined);
const mockFetch = vi.fn<typeof fetch>();
const mockScrollIntoView = vi.fn();
const mockScrollTo = vi.fn();
const mockPushState = vi.fn();

vi.stubGlobal("fetch", mockFetch);

vi.mock("./lazy-public-trip-map", () => ({
  LazyPublicTripMap: ({
    route,
    tripName,
    tripStops,
    onItineraryItemAction,
  }: {
    route: { distanceMeters: number } | null;
    tripName: string;
    tripStops: PublicTripDetail["itinerary"];
    onItineraryItemAction: (itemKey: string) => void;
  }) => (
    <div data-testid="public-trip-map">
      <div>
        trip:{tripName}|distance:{route?.distanceMeters ?? "none"}
      </div>
      {tripStops.map((item) =>
        item.kind === "visit" ? (
          <button
            key={item.visit.id}
            type="button"
            onClick={() =>
              onItineraryItemAction(createTripItineraryItemKey("visit", item.visit.id))
            }
          >
            map-open-{createTripItineraryItemKey("visit", item.visit.id)}
          </button>
        ) : (
          <button
            key={item.stop.id}
            type="button"
            onClick={() => onItineraryItemAction(createTripItineraryItemKey("stop", item.stop.id))}
          >
            map-open-{createTripItineraryItemKey("stop", item.stop.id)}
          </button>
        ),
      )}
    </div>
  ),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authState,
}));

vi.mock("@/components/visits/visit-image-gallery", () => ({
  VisitImageGallery: ({ images }: { images: VisitImage[] }) => (
    <div data-testid="visit-image-gallery">images:{images.length}</div>
  ),
}));

const trip: PublicTripDetail = {
  id: 7,
  name: "Kesaretki",
  slug: "kesaretki",
  description: "Kesäinen kierros pohjoiseen.",
  startingPoint: {
    displayName: "Helsinki",
    label: "Helsinki",
    coordinate: {
      lat: 60.1699,
      lon: 24.9384,
    },
  },
  visitCount: 2,
  stopCount: 1,
  imageCount: 3,
  dateRange: {
    start: "2024-06-15",
    end: "2024-06-18",
  },
  createdAt: "2024-06-18T10:00:00Z",
  updatedAt: "2024-06-18T10:00:00Z",
  route: {
    success: true,
    error: null,
    data: {
      distanceMeters: 880000,
      durationSeconds: 36000,
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
    },
  },
  itinerary: [
    {
      kind: "visit",
      tripStopOrder: 1,
      visit: {
        id: 11,
        author: null,
        createdAt: "2024-06-15T10:00:00Z",
        excludeFromRoute: false,
        location: null,
        note: "Aamupäivän kierros",
        park: {
          name: "Nuuksio",
          slug: "nuuksio",
          markerPoint: {
            lat: 60.31,
            lon: 24.53,
          },
          typeLabel: "Kansallispuisto",
        },
        route: "Punarinnankierros",
        updatedAt: "2024-06-15T10:00:00Z",
        visitedOn: "2024-06-15",
        imageCount: 1,
      },
    },
    {
      kind: "stop",
      tripStopOrder: 2,
      stop: {
        id: 31,
        images: [],
        createdAt: "2024-06-16T10:00:00Z",
        location: {
          displayName: "Yöpyminen Oulussa",
          label: "Yöpyminen Oulussa",
          coordinate: {
            lat: 65.0121,
            lon: 25.4651,
          },
        },
        note: "Hotelli keskustassa",
        tripStopOrder: 2,
        updatedAt: "2024-06-16T10:00:00Z",
        visitedOn: "2024-06-16",
      },
    },
    {
      kind: "visit",
      tripStopOrder: 3,
      visit: {
        id: 12,
        author: null,
        createdAt: "2024-06-18T10:00:00Z",
        excludeFromRoute: true,
        location: null,
        note: null,
        park: {
          name: "Pallas-Yllästunturi",
          slug: "pallas-yllastunturi",
          markerPoint: {
            lat: 67.5,
            lon: 24,
          },
          typeLabel: "Kansallispuisto",
        },
        route: null,
        updatedAt: "2024-06-18T10:00:00Z",
        visitedOn: "2024-06-18",
        imageCount: 2,
      },
    },
  ],
};

const createTripWithoutExpandableThirdVisit = (): PublicTripDetail => ({
  ...trip,
  itinerary: trip.itinerary.map((item) =>
    item.kind === "visit" && item.visit.id === 12
      ? {
          ...item,
          visit: {
            ...item.visit,
            imageCount: 0,
            note: null,
          },
        }
      : item,
  ),
});

const createTripWithImageOnlyStop = (): PublicTripDetail => ({
  ...trip,
  itinerary: trip.itinerary.map((item) =>
    item.kind === "stop"
      ? {
          ...item,
          stop: {
            ...item.stop,
            images: [
              {
                id: 41,
                createdAt: "2024-06-16T10:00:00Z",
                displayOrder: 1,
                fullHeight: null,
                fullUrl: "https://images.example.com/stop.jpg",
                fullWidth: null,
                originalName: "stop.jpg",
                thumbHeight: null,
                thumbUrl: "https://images.example.com/stop-thumb.jpg",
                thumbWidth: null,
              },
            ],
            note: null,
          },
        }
      : item,
  ),
});

const setWindowScrollY = (value: number) => {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value,
    writable: true,
  });
};

const createRect = (top: number, height = 100) =>
  ({
    bottom: top + height,
    height,
    left: 0,
    right: 0,
    toJSON: () => ({}),
    top,
    width: 0,
    x: 0,
    y: top,
  }) satisfies DOMRect;

const setSectionScrollPositions = ({
  descriptionTop,
  descriptionHeight = 240,
  itineraryTop,
  itineraryHeight = 240,
  navBottom,
  routeTop,
  routeHeight = 240,
}: {
  descriptionTop: number;
  descriptionHeight?: number;
  itineraryTop: number;
  itineraryHeight?: number;
  navBottom: number;
  routeTop: number;
  routeHeight?: number;
}) => {
  const navigation = screen.getByRole("navigation", {
    name: "tripPage.sectionNavigationLabel",
  });
  const descriptionSection = screen.getByRole("region", {
    name: "tripPage.descriptionTitle",
  });
  const routeSection = screen.getByRole("region", {
    name: "tripPage.routeTitle",
  });
  const itinerarySection = screen.getByRole("region", {
    name: "tripPage.itineraryTitle",
  });

  navigation.getBoundingClientRect = () => createRect(navBottom - 40, 40);
  descriptionSection.getBoundingClientRect = () => createRect(descriptionTop, descriptionHeight);
  routeSection.getBoundingClientRect = () => createRect(routeTop, routeHeight);
  itinerarySection.getBoundingClientRect = () => createRect(itineraryTop, itineraryHeight);
};

const setStickyNavigationHeight = (height: number) => {
  const navigation = screen.getByRole("navigation", {
    name: "tripPage.sectionNavigationLabel",
  });

  Object.defineProperty(navigation, "offsetHeight", {
    configurable: true,
    value: height,
  });
};

describe("PublicTripPage", () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    setWindowScrollY(0);
    mockWriteText.mockReset();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          visits: {
            "11": {
              images: [
                {
                  id: 501,
                  fullUrl: "https://images.example.com/nuuksio.jpg",
                  thumbUrl: "https://images.example.com/nuuksio-thumb.jpg",
                  fullWidth: 1600,
                  fullHeight: 900,
                  thumbWidth: 640,
                  thumbHeight: 360,
                  originalName: "nuuksio.jpg",
                  displayOrder: 1,
                  createdAt: "2024-06-15T12:00:00Z",
                },
              ],
            },
            "12": {
              images: [
                {
                  id: 601,
                  fullUrl: "https://images.example.com/pallas.jpg",
                  thumbUrl: "https://images.example.com/pallas-thumb.jpg",
                  fullWidth: 1600,
                  fullHeight: 900,
                  thumbWidth: 640,
                  thumbHeight: 360,
                  originalName: "pallas.jpg",
                  displayOrder: 1,
                  createdAt: "2024-06-18T12:00:00Z",
                },
                {
                  id: 602,
                  fullUrl: "https://images.example.com/pallas-2.jpg",
                  thumbUrl: "https://images.example.com/pallas-2-thumb.jpg",
                  fullWidth: 1600,
                  fullHeight: 900,
                  thumbWidth: 640,
                  thumbHeight: 360,
                  originalName: "pallas-2.jpg",
                  displayOrder: 2,
                  createdAt: "2024-06-18T12:05:00Z",
                },
              ],
            },
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        },
      ),
    );
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: mockScrollIntoView,
    });
    mockScrollIntoView.mockReset();
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: mockWriteText,
      },
    });
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      writable: true,
      value: mockScrollTo,
    });
    mockScrollTo.mockReset();
    Object.defineProperty(window.history, "pushState", {
      configurable: true,
      writable: true,
      value: mockPushState,
    });
    mockPushState.mockReset();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: "",
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      writable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  it("renders the trip summary, route section, and itinerary", () => {
    render(<PublicTripPage trip={trip} />);

    expect(screen.getByRole("heading", { name: "Kesaretki" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "tripPage.descriptionTitle" })).toBeInTheDocument();
    expect(screen.getByText("Kesäinen kierros pohjoiseen.")).toHaveClass("max-w-none!");
    expect(screen.getByText("2 tripPage.visitCount")).toBeInTheDocument();
    expect(screen.getByText("1 tripPage.stopCount")).toBeInTheDocument();
    expect(screen.getByText("3 tripPage.imageCount")).toBeInTheDocument();
    expect(screen.getByTestId("public-trip-map")).toHaveTextContent(
      "trip:Kesaretki|distance:880000",
    );
    expect(screen.getByText("tripPage.routeDistanceLabel")).toBeInTheDocument();
    expect(screen.getByText("tripPage.itineraryDescription")).toBeInTheDocument();
    expect(screen.getByText("Punarinnankierros")).toHaveClass("text-emerald-900");
    expect(screen.getByText("1 tripPage.imageCount")).toHaveClass("text-primary");
    expect(screen.queryByText("Helsinki")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tripPage.copyTripPageLink" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "tripPage.showVisit" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "tripPage.showStop" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getAllByText("tripPage.visitLabel")).toHaveLength(2);
    expect(screen.getByText("tripPage.stopLabel")).toBeInTheDocument();

    const itinerary = screen.getByRole("list", { name: "tripPage.itineraryTitle" });
    expect(within(itinerary).getByRole("link", { name: "Nuuksio" })).toHaveAttribute(
      "href",
      "/paikka/nuuksio?visit=11#visit-history",
    );
    expect(within(itinerary).getByText("Yöpyminen Oulussa")).toBeInTheDocument();
    expect(within(itinerary).getByRole("link", { name: "Pallas-Yllästunturi" })).toHaveAttribute(
      "href",
      "/paikka/pallas-yllastunturi?visit=12#visit-history",
    );
    expect(within(itinerary).queryByText("tripPage.excludedFromRoute")).not.toBeInTheDocument();
  });

  it("renders a compact section navigation and updates the active chip by scroll position", () => {
    render(<PublicTripPage trip={trip} />);

    const sectionNavigation = screen.getByRole("navigation", {
      name: "tripPage.sectionNavigationLabel",
    });
    const descriptionLink = within(sectionNavigation).getByRole("link", {
      name: "tripPage.sectionNav.description",
    });
    const routeLink = within(sectionNavigation).getByRole("link", {
      name: "tripPage.sectionNav.route",
    });
    const itineraryLink = within(sectionNavigation).getByRole("link", {
      name: "tripPage.sectionNav.itinerary",
    });

    expect(descriptionLink).toHaveAttribute("href", "#trip-description");
    expect(routeLink).toHaveAttribute("href", "#trip-route");
    expect(itineraryLink).toHaveAttribute("href", "#trip-itinerary");
    expect(
      sectionNavigation.compareDocumentPosition(
        screen.getByRole("heading", { name: "tripPage.descriptionTitle" }),
      ),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    setSectionScrollPositions({
      descriptionTop: -320,
      itineraryTop: 1200,
      navBottom: 40,
      routeTop: 44,
    });

    act(() => {
      fireEvent.scroll(window);
    });

    act(() => {
      setWindowScrollY(420);
      fireEvent.scroll(window);
    });

    expect(routeLink).toHaveAttribute("aria-current", "location");
    expect(descriptionLink).not.toHaveAttribute("aria-current");

    setSectionScrollPositions({
      descriptionTop: -920,
      itineraryTop: 44,
      navBottom: 40,
      routeTop: -280,
    });

    act(() => {
      setWindowScrollY(1360);
      fireEvent.scroll(window);
    });

    expect(itineraryLink).toHaveAttribute("aria-current", "location");
    expect(routeLink).not.toHaveAttribute("aria-current");
  });

  it("switches to the itinerary chip on small screens when the itinerary occupies more of the viewport", () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 640,
      writable: true,
    });

    render(<PublicTripPage trip={trip} />);

    const sectionNavigation = screen.getByRole("navigation", {
      name: "tripPage.sectionNavigationLabel",
    });
    const routeLink = within(sectionNavigation).getByRole("link", {
      name: "tripPage.sectionNav.route",
    });
    const itineraryLink = within(sectionNavigation).getByRole("link", {
      name: "tripPage.sectionNav.itinerary",
    });

    setSectionScrollPositions({
      descriptionTop: -1200,
      descriptionHeight: 240,
      itineraryTop: 520,
      itineraryHeight: 520,
      navBottom: 40,
      routeTop: -80,
      routeHeight: 220,
    });

    act(() => {
      setWindowScrollY(980);
      fireEvent.scroll(window);
    });

    expect(itineraryLink).toHaveAttribute("aria-current", "location");
    expect(routeLink).not.toHaveAttribute("aria-current");
  });

  it("scrolls downward to a section using the hidden-header offset", async () => {
    const user = userEvent.setup();

    render(<PublicTripPage trip={trip} />);

    setStickyNavigationHeight(40);
    act(() => {
      fireEvent.resize(window);
    });
    setWindowScrollY(0);
    setSectionScrollPositions({
      descriptionTop: 48,
      itineraryTop: 1200,
      navBottom: 40,
      routeTop: 600,
    });

    await user.click(
      screen.getByRole("link", {
        name: "tripPage.sectionNav.route",
      }),
    );

    expect(mockPushState).toHaveBeenCalledWith(null, "", "#trip-route");
    expect(mockScrollTo).toHaveBeenCalledWith({
      behavior: "smooth",
      top: 560,
    });
  });

  it("scrolls upward to a section using the visible-header offset and reduced motion behavior", async () => {
    const user = userEvent.setup();

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });

    render(<PublicTripPage trip={trip} />);

    setStickyNavigationHeight(40);
    act(() => {
      fireEvent.resize(window);
    });
    setWindowScrollY(1400);
    setSectionScrollPositions({
      descriptionTop: -1200,
      itineraryTop: 100,
      navBottom: 40,
      routeTop: -500,
    });

    await user.click(
      screen.getByRole("link", {
        name: "tripPage.sectionNav.route",
      }),
    );

    expect(mockPushState).toHaveBeenCalledWith(null, "", "#trip-route");
    expect(mockScrollTo).toHaveBeenCalledWith({
      behavior: "auto",
      top: 804,
    });
  });

  it("does not scroll when the requested navigation target is missing", async () => {
    const user = userEvent.setup();

    render(<PublicTripPage trip={trip} />);

    const originalGetElementById = document.getElementById.bind(document);
    const getElementByIdSpy = vi
      .spyOn(document, "getElementById")
      .mockImplementation((elementId) =>
        elementId === "trip-route" ? null : originalGetElementById(elementId),
      );

    await user.click(
      screen.getByRole("link", {
        name: "tripPage.sectionNav.route",
      }),
    );

    expect(mockPushState).not.toHaveBeenCalled();
    expect(mockScrollTo).not.toHaveBeenCalled();

    getElementByIdSpy.mockRestore();
  });

  it("opens trip visit details inline and loads image galleries without leaving the page", async () => {
    const user = userEvent.setup();

    render(<PublicTripPage trip={trip} />);

    await user.click(screen.getAllByRole("button", { name: "tripPage.showVisit" })[0]);

    expect(screen.getByText("Aamupäivän kierros")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    expect(mockFetch.mock.calls[0]?.[0]).toBe("/api/trips/slug/kesaretki/visit-details");

    const nuuksioVisitCard = screen.getByRole("link", { name: "Nuuksio" }).closest("li");

    if (!(nuuksioVisitCard instanceof HTMLElement)) {
      throw new Error("Expected Nuuksio visit card");
    }

    await waitFor(() => {
      expect(within(nuuksioVisitCard).getByTestId("visit-image-gallery")).toHaveTextContent(
        "images:1",
      );
    });
  });

  it("opens stop details inline with the same toggle treatment", async () => {
    const user = userEvent.setup();

    render(<PublicTripPage trip={trip} />);

    const stopToggleButton = screen.getByRole("button", { name: "tripPage.showStop" });
    expect(stopToggleButton).toHaveAttribute("aria-expanded", "false");

    await user.click(stopToggleButton);

    expect(screen.getByRole("button", { name: "tripPage.hideStop" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("Hotelli keskustassa")).toBeInTheDocument();
  });

  it("shows a stop image section only when the stop has images", async () => {
    const user = userEvent.setup();

    render(<PublicTripPage trip={createTripWithImageOnlyStop()} />);

    await user.click(screen.getByRole("button", { name: "tripPage.showStop" }));

    const stopCard = screen.getByText("Yöpyminen Oulussa").closest("li");

    if (!(stopCard instanceof HTMLElement)) {
      throw new Error("Expected stop card");
    }

    expect(within(stopCard).getByText("1 tripPage.imageCount")).toBeInTheDocument();
    expect(within(stopCard).getByTestId("visit-image-gallery")).toHaveTextContent("images:1");
    expect(screen.queryByText("Hotelli keskustassa")).not.toBeInTheDocument();
  });

  it("reveals and scrolls to the requested visit when the trip map action is used", async () => {
    const user = userEvent.setup();

    render(<PublicTripPage trip={trip} />);

    await user.click(screen.getByRole("button", { name: "map-open-visit:11" }));

    expect(mockScrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "tripPage.hideVisit" })).toBeInTheDocument();
  });

  it("reveals and scrolls to the requested stop when the trip map action is used", async () => {
    const user = userEvent.setup();

    render(<PublicTripPage trip={trip} />);

    await user.click(screen.getByRole("button", { name: "map-open-stop:31" }));

    expect(mockScrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "tripPage.hideStop" })).toBeInTheDocument();
  });

  it("hides the visit toggle when a visit has no expandable content but still allows map scrolling", async () => {
    const user = userEvent.setup();

    render(<PublicTripPage trip={createTripWithoutExpandableThirdVisit()} />);

    expect(screen.getAllByRole("button", { name: "tripPage.showVisit" })).toHaveLength(1);

    const thirdVisitCard = screen.getByRole("link", { name: "Pallas-Yllästunturi" }).closest("li");

    if (!(thirdVisitCard instanceof HTMLElement)) {
      throw new Error("Expected Pallas-Yllästunturi visit card");
    }

    expect(
      within(thirdVisitCard).queryByRole("button", { name: "tripPage.showVisit" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "map-open-visit:12" }));

    expect(mockScrollIntoView).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "tripPage.hideVisit" })).not.toBeInTheDocument();
  });

  it("renders the trip map without a route line when route geometry is unavailable", () => {
    render(
      <PublicTripPage
        trip={{
          ...trip,
          route: {
            success: true,
            error: null,
            data: null,
          },
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "tripPage.routeTitle" })).toBeInTheDocument();
    expect(screen.getByTestId("public-trip-map")).toHaveTextContent("trip:Kesaretki|distance:none");
    expect(screen.queryByText("tripPage.routeDistanceLabel")).not.toBeInTheDocument();
  });

  it("keeps itinerary points on the map when route generation failed", () => {
    render(
      <PublicTripPage
        trip={{
          ...trip,
          route: {
            success: false,
            data: null,
            error: {
              error: "provider down",
              errorCode: "provider_unavailable",
            },
          },
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "tripPage.routeTitle" })).toBeInTheDocument();
    expect(screen.getByTestId("public-trip-map")).toHaveTextContent("trip:Kesaretki|distance:none");
    expect(screen.queryByText("tripPage.routeError")).not.toBeInTheDocument();
  });

  it("hides optional hero and summary details when the trip does not include them", () => {
    render(
      <PublicTripPage
        trip={{
          ...trip,
          description: "Ensimmainen rivi\nToinen rivi",
          dateRange: null,
          imageCount: 0,
          route: {
            success: true,
            error: null,
            data: null,
          },
          startingPoint: null,
          stopCount: 0,
        }}
      />,
    );

    const description = screen.getByText(/Ensimmainen rivi/);
    expect(description).toHaveClass("whitespace-pre-line");
    expect(description).toHaveClass("max-w-none!");
    expect(description).toHaveTextContent("Ensimmainen rivi Toinen rivi");
    expect(screen.queryByText("1 tripPage.stopCount")).not.toBeInTheDocument();
    expect(screen.queryByText("3 tripPage.imageCount")).not.toBeInTheDocument();
    expect(screen.queryByText("Helsinki")).not.toBeInTheDocument();
    expect(screen.queryByTestId("public-trip-map")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "tripPage.routeTitle" })).not.toBeInTheDocument();
    const sectionNavigation = screen.getByRole("navigation", {
      name: "tripPage.sectionNavigationLabel",
    });
    expect(
      within(sectionNavigation).queryByRole("link", { name: "tripPage.sectionNav.route" }),
    ).not.toBeInTheDocument();
    expect(
      within(sectionNavigation).getByRole("link", { name: "tripPage.sectionNav.description" }),
    ).toHaveAttribute("href", "#trip-description");
    expect(
      within(sectionNavigation).getByRole("link", { name: "tripPage.sectionNav.itinerary" }),
    ).toHaveAttribute("href", "#trip-itinerary");
  });

  it("copies the trip page link from the hero", async () => {
    render(<PublicTripPage trip={trip} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "tripPage.copyTripPageLink" }));
    });

    expect(mockWriteText).toHaveBeenCalledWith("http://localhost:3000/retki/kesaretki");
    expect(screen.getByRole("button", { name: "tripPage.copyTripPageLink" })).toHaveAttribute(
      "aria-describedby",
    );
    expect(screen.getByText("tripPage.tripPageLinkCopied")).toBeInTheDocument();
  });

  it("shows the admin edit link next to the trip summary pills for authenticated users", () => {
    authState.isAuthenticated = true;

    render(<PublicTripPage trip={trip} />);

    expect(screen.getByRole("link", { name: "tripPage.editTrip" })).toHaveAttribute(
      "href",
      "/hallinta/retket/7/muokkaa",
    );

    authState.isAuthenticated = false;
  });
});
