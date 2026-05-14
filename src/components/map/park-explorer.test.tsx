import type { MapPark } from "@/lib/parks";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
});
