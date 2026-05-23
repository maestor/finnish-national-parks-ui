import type { MapPark } from "@/lib/parks";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  HomeMapControlsProvider,
  useHomeMapControls,
} from "../providers/home-map-controls-provider";
import { ParkExplorer } from "./park-explorer";

const mockUseAuth = vi.fn(() => ({
  isAuthenticated: false,
  isLoading: false,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("./park-map", () => ({
  ParkMap: ({
    parks,
    canManageVisits,
    homeParkFocusRequest,
  }: {
    parks: MapPark[];
    canManageVisits?: boolean;
    homeParkFocusRequest?: { slug: string } | null;
  }) => (
    <div>
      <p>count:{parks.length}</p>
      <p>admin:{String(canManageVisits)}</p>
      <p>focus:{homeParkFocusRequest?.slug ?? "none"}</p>
      <ul>
        {parks.map((park) => (
          <li key={park.slug}>{park.name}</li>
        ))}
      </ul>
    </div>
  ),
}));

const parks: MapPark[] = [
  {
    slug: "paijanne",
    name: "Päijänteen kansallispuisto",
    areaKm2: 14,
    locationLabel: "Päijät-Häme",
    luontoonUrl: null,
    establishmentYear: 1993,
    boundingBox: { minLat: 61, minLon: 25, maxLat: 62, maxLon: 26 },
    markerPoint: { lat: 61.5, lon: 25.5 },
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
    visitedSummary: { visited: true, visitCount: 1, lastVisitedOn: "2024-06-15" },
  },
  {
    slug: "teijo",
    name: "Teijon kansallispuisto",
    areaKm2: 11,
    locationLabel: "Varsinais-Suomi",
    luontoonUrl: null,
    establishmentYear: 2015,
    boundingBox: { minLat: 60, minLon: 22, maxLat: 61, maxLon: 23 },
    markerPoint: { lat: 60.5, lon: 22.5 },
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
    visitedSummary: { visited: false, visitCount: 0, lastVisitedOn: null },
  },
  {
    slug: "syote",
    name: "Iso-Syötteen retkeilyalue",
    areaKm2: 20,
    locationLabel: "Pohjois-Pohjanmaa",
    luontoonUrl: null,
    establishmentYear: null,
    boundingBox: { minLat: 65, minLon: 28, maxLat: 66, maxLon: 29 },
    markerPoint: { lat: 65.5, lon: 28.5 },
    type: { code: 2, id: 2, name: "Valtion retkeilyalue", slug: "state-hiking-area" },
    visitedSummary: { visited: false, visitCount: 0, lastVisitedOn: null },
  },
];

const MobileFilterToggleHarness = () => {
  const { toggleMobileFilters, focusParkOnHome } = useHomeMapControls();

  return (
    <>
      <button type="button" onClick={toggleMobileFilters}>
        toggle-mobile-filters
      </button>
      <button type="button" onClick={() => focusParkOnHome("teijo")}>
        focus-teijo
      </button>
    </>
  );
};

describe("ParkExplorer", () => {
  it("enables map admin quick actions for authenticated users", () => {
    mockUseAuth.mockReturnValueOnce({
      isAuthenticated: true,
      isLoading: false,
    });

    render(<ParkExplorer parks={parks} />);

    expect(screen.getByText("admin:true")).toBeInTheDocument();
  });

  it("filters the visible parks by selected type", async () => {
    render(<ParkExplorer parks={parks} />);

    expect(screen.getByText("count:3")).toBeInTheDocument();
    expect(screen.getByText("admin:false")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "home.filters.hikingAreas" }));

    expect(screen.getByText("count:1")).toBeInTheDocument();
    expect(screen.getByText("Iso-Syötteen retkeilyalue")).toBeInTheDocument();
  });

  it("shows visited filters for all users when visit history is public", () => {
    render(<ParkExplorer parks={parks} />);

    expect(screen.getByRole("button", { name: "home.filters.visited" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "home.filters.notVisited" })).toBeInTheDocument();
  });

  it("renders desktop filters as a floating vertical overlay on the left", () => {
    const { container } = render(<ParkExplorer parks={parks} />);

    const desktopSidebar = container.querySelector("aside");

    expect(desktopSidebar).toBeInTheDocument();
    expect(desktopSidebar).toHaveClass("absolute", "left-4", "w-40", "md:top-4");

    const buttons = within(desktopSidebar as HTMLElement).getAllByRole("button");

    expect(buttons).toHaveLength(7);
    expect(buttons[0]).toHaveTextContent("home.filters.all");
    expect(buttons[1]).toHaveTextContent("home.filters.nationalParks");
  });

  it("keeps mobile filters collapsed until opened and closes after selection", async () => {
    render(
      <HomeMapControlsProvider>
        <MobileFilterToggleHarness />
        <ParkExplorer parks={parks} />
      </HomeMapControlsProvider>,
    );

    const mobileFilters = document.querySelector("#park-map-filters-mobile");

    expect(mobileFilters).toBeInTheDocument();
    expect(mobileFilters).toHaveClass("hidden");

    fireEvent.click(screen.getByRole("button", { name: "toggle-mobile-filters" }));

    expect(mobileFilters).toHaveClass("block");

    fireEvent.click(
      within(mobileFilters as HTMLElement).getByRole("button", {
        name: "home.filters.hikingAreas",
      }),
    );

    expect(mobileFilters).toHaveClass("hidden");
    expect(screen.getByText("count:1")).toBeInTheDocument();
  });

  it("resets filters so a focused park from the header search stays visible on the map", () => {
    render(
      <HomeMapControlsProvider>
        <MobileFilterToggleHarness />
        <ParkExplorer parks={parks} />
      </HomeMapControlsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "home.filters.hikingAreas" }));

    expect(screen.getByText("count:1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "focus-teijo" }));

    expect(screen.getByText("count:3")).toBeInTheDocument();
    expect(screen.getByText("focus:teijo")).toBeInTheDocument();
  });
});
