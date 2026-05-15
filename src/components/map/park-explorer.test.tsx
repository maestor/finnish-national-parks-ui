import type { MapPark } from "@/lib/parks";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  HomeMapControlsProvider,
  useHomeMapControls,
} from "../providers/home-map-controls-provider";
import { ParkExplorer } from "./park-explorer";

vi.mock("./park-map", () => ({
  ParkMap: ({ parks }: { parks: MapPark[] }) => (
    <div>
      <p>count:{parks.length}</p>
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
    visitedSummary: { visited: true },
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
    visitedSummary: { visited: false },
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
    visitedSummary: { visited: false },
  },
];

const MobileFilterToggleHarness = () => {
  const { toggleMobileFilters } = useHomeMapControls();

  return (
    <button type="button" onClick={toggleMobileFilters}>
      toggle-mobile-filters
    </button>
  );
};

describe("ParkExplorer", () => {
  it("filters the visible parks by selected type", async () => {
    render(<ParkExplorer parks={parks} />);

    expect(screen.getByText("count:3")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "home.filters.hikingAreas" }));

    expect(screen.getByText("count:1")).toBeInTheDocument();
    expect(screen.getByText("Iso-Syötteen retkeilyalue")).toBeInTheDocument();
  });

  it("shows visited filters only for authenticated users", () => {
    const { rerender } = render(<ParkExplorer parks={parks} />);

    expect(screen.queryByRole("button", { name: "home.filters.visited" })).not.toBeInTheDocument();

    rerender(<ParkExplorer parks={parks} isAuthenticated />);

    expect(screen.getByRole("button", { name: "home.filters.visited" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "home.filters.notVisited" })).toBeInTheDocument();
  });

  it("renders desktop filters as a floating vertical overlay on the left", () => {
    const { container } = render(<ParkExplorer parks={parks} isAuthenticated />);

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
        <ParkExplorer parks={parks} isAuthenticated />
      </HomeMapControlsProvider>,
    );

    const mobileFilters = document.querySelector("#park-map-filters-mobile");

    expect(mobileFilters).toBeInTheDocument();
    expect(mobileFilters).toHaveClass("hidden");

    await userEvent.click(screen.getByRole("button", { name: "toggle-mobile-filters" }));

    expect(mobileFilters).toHaveClass("block");

    await userEvent.click(
      within(mobileFilters as HTMLElement).getByRole("button", {
        name: "home.filters.hikingAreas",
      }),
    );

    expect(mobileFilters).toHaveClass("hidden");
    expect(screen.getByText("count:1")).toBeInTheDocument();
  });
});
