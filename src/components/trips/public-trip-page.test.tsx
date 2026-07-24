import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicTripDetail } from "@/lib/trips";
import { PublicTripPage } from "./public-trip-page";

const authState = {
  isAuthenticated: false,
  isLoading: false,
  logout: vi.fn(),
  user: null,
};
const mockWriteText = vi.fn().mockResolvedValue(undefined);

vi.mock("./lazy-public-trip-map", () => ({
  LazyPublicTripMap: ({
    route,
    tripName,
  }: {
    route: { distanceMeters: number } | null;
    tripName: string;
  }) => (
    <div data-testid="public-trip-map">
      trip:{tripName}|distance:{route?.distanceMeters ?? "none"}
    </div>
  ),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authState,
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

describe("PublicTripPage", () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    mockWriteText.mockReset();
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: mockWriteText,
      },
    });
  });

  it("renders the trip summary, route section, and itinerary", () => {
    render(<PublicTripPage trip={trip} />);

    expect(screen.getByRole("heading", { name: "Kesaretki" })).toBeInTheDocument();
    expect(screen.getByText("Kesäinen kierros pohjoiseen.")).toHaveClass("!max-w-none");
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
    expect(description).toHaveClass("!max-w-none");
    expect(description).toHaveTextContent("Ensimmainen rivi Toinen rivi");
    expect(screen.queryByText("1 tripPage.stopCount")).not.toBeInTheDocument();
    expect(screen.queryByText("3 tripPage.imageCount")).not.toBeInTheDocument();
    expect(screen.queryByText("Helsinki")).not.toBeInTheDocument();
    expect(screen.queryByTestId("public-trip-map")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "tripPage.routeTitle" })).not.toBeInTheDocument();
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
