import type { FilterableMapPark } from "@/lib/parks";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HomeMapControlsProvider,
  useHomeMapControls,
} from "../providers/home-map-controls-provider";
import { ParkExplorer } from "./park-explorer";

const { pathnameState, searchParamsState, replaceMock } = vi.hoisted(() => ({
  pathnameState: { value: "/" },
  searchParamsState: { value: "" },
  replaceMock: vi.fn(),
}));

const mockUseAuth = vi.fn(() => ({
  isAuthenticated: false,
  isLoading: false,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

vi.mock("./park-map", () => ({
  ParkMap: ({
    parks,
    canManageVisits,
    homeParkFocusRequest,
    resetViewRequestId,
    onActiveSlugChange,
  }: {
    parks: FilterableMapPark[];
    canManageVisits?: boolean;
    homeParkFocusRequest?: { slug: string } | null;
    resetViewRequestId?: number;
    onActiveSlugChange?: (slug: string | null) => void;
  }) => (
    <div>
      <p>count:{parks.length}</p>
      <p>admin:{String(canManageVisits)}</p>
      <p>focus:{homeParkFocusRequest?.slug ?? "none"}</p>
      <p>reset:{resetViewRequestId ?? 0}</p>
      <button type="button" onClick={() => onActiveSlugChange?.("paijanne")}>
        mock-select-park
      </button>
      <button type="button" onClick={() => onActiveSlugChange?.(null)}>
        mock-clear-park
      </button>
      <ul>
        {parks.map((park) => (
          <li key={park.slug}>{park.name}</li>
        ))}
      </ul>
    </div>
  ),
}));

const parks: FilterableMapPark[] = [
  {
    slug: "paijanne",
    name: "Päijänteen kansallispuisto",
    areaKm2: 14,
    address: "Päijänteentie 1, 17200 Vääksy",
    logo: {
      key: "paijanne-logo",
      updatedAt: "2024-01-01T00:00:00Z",
      url: "https://example.com/paijanne-logo.png",
    },
    luontoonUrl: null,
    map: {
      key: "paijanne-map",
      updatedAt: "2024-01-01T00:00:00Z",
      url: "https://example.com/paijanne-map.pdf",
    },
    category: { name: "Kansallispuistot", slug: "national-park" },
    establishmentYear: 1993,
    locationLabel: "Päijänteentie 1",
    boundingBox: { minLat: 61, minLon: 25, maxLat: 62, maxLon: 26 },
    markerPoint: { lat: 61.5, lon: 25.5 },
    postalCode: "17200",
    postalOffice: "Vääksy",
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
    visitedSummary: { visited: true, visitCount: 1, lastVisitedOn: "2024-06-15" },
  },
  {
    slug: "teijo",
    name: "Teijon kansallispuisto",
    areaKm2: 11,
    address: "Matildanjärventie 84, 25570 Mathildedal",
    logo: {
      key: "teijo-logo",
      updatedAt: "2024-01-01T00:00:00Z",
      url: "https://example.com/teijo-logo.png",
    },
    luontoonUrl: null,
    map: null,
    category: { name: "Kansallispuistot", slug: "national-park" },
    establishmentYear: 2015,
    locationLabel: "Matildanjärventie 84",
    boundingBox: { minLat: 60, minLon: 22, maxLat: 61, maxLon: 23 },
    markerPoint: { lat: 60.5, lon: 22.5 },
    postalCode: "25570",
    postalOffice: "Mathildedal",
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
    visitedSummary: { visited: false, visitCount: 0, lastVisitedOn: null },
  },
  {
    slug: "syote",
    name: "Iso-Syötteen retkeilyalue",
    areaKm2: 20,
    address: "Syötetie 4, 93280 Syöte",
    logo: null,
    luontoonUrl: null,
    map: {
      key: "syote-map",
      updatedAt: "2024-01-01T00:00:00Z",
      url: "https://example.com/syote-map.pdf",
    },
    category: { name: "Erämaa- ja retkeilyalueet", slug: "hiking-and-wilderness-areas" },
    establishmentYear: null,
    locationLabel: "Syötetie 4",
    boundingBox: { minLat: 65, minLon: 28, maxLat: 66, maxLon: 29 },
    markerPoint: { lat: 65.5, lon: 28.5 },
    postalCode: "93280",
    postalOffice: "Syöte",
    type: { code: 2, id: 2, name: "Valtion retkeilyalue", slug: "hiking-area" },
    visitedSummary: { visited: false, visitCount: 0, lastVisitedOn: null },
  },
  {
    slug: "verla",
    name: "Verlan tehdaskylä",
    areaKm2: 1,
    address: "Verlantie 295, 47850 Verla",
    logo: null,
    luontoonUrl: null,
    map: null,
    category: { name: "Tehdaskylät", slug: "factory-village" },
    establishmentYear: 1972,
    locationLabel: "Verlantie 295",
    boundingBox: { minLat: 61.1, minLon: 26.5, maxLat: 61.2, maxLon: 26.6 },
    markerPoint: { lat: 61.15, lon: 26.55 },
    postalCode: "47850",
    postalOffice: "Verla",
    type: { code: 8, id: 8, name: "Tehdaskylä", slug: "factory-village" },
    visitedSummary: { visited: false, visitCount: 0, lastVisitedOn: null },
  },
  {
    slug: "punkaharju",
    name: "Punkaharjun luontopolku",
    areaKm2: null,
    address: "Harjutie 2, 58450 Punkaharju",
    logo: null,
    luontoonUrl: null,
    map: null,
    category: { name: "Polut ja reitit", slug: "trails-and-routes" },
    establishmentYear: null,
    locationLabel: "Harjutie 2",
    boundingBox: { minLat: 61, minLon: 29, maxLat: 62, maxLon: 30 },
    markerPoint: { lat: 61.8, lon: 29.3 },
    postalCode: "58450",
    postalOffice: "Punkaharju",
    type: { code: 6, id: 6, name: "Luontopolku", slug: "nature-trail" },
    visitedSummary: { visited: false, visitCount: 0, lastVisitedOn: null },
  },
  {
    slug: "nuuksio",
    name: "Nuuksion vaellusreitti",
    areaKm2: null,
    address: "Nuuksiontie 83, 02820 Espoo",
    logo: null,
    luontoonUrl: null,
    map: null,
    category: { name: "Polut ja reitit", slug: "trails-and-routes" },
    establishmentYear: null,
    locationLabel: "Nuuksiontie 83",
    boundingBox: { minLat: 60, minLon: 24, maxLat: 61, maxLon: 25 },
    markerPoint: { lat: 60.3, lon: 24.5 },
    postalCode: "02820",
    postalOffice: "Espoo",
    type: { code: 7, id: 7, name: "Vaellusreitti", slug: "hiking-trail" },
    visitedSummary: { visited: true, visitCount: 2, lastVisitedOn: "2024-07-20" },
  },
  {
    slug: "pyha",
    name: "Pyhän kävelyreitti",
    areaKm2: null,
    address: "Kultakeronkatu 21, 98530 Pyhätunturi",
    logo: null,
    luontoonUrl: null,
    map: null,
    category: { name: "Polut ja reitit", slug: "trails-and-routes" },
    establishmentYear: null,
    locationLabel: "Kultakeronkatu 21",
    boundingBox: { minLat: 67, minLon: 27, maxLat: 67.2, maxLon: 27.2 },
    markerPoint: { lat: 67.1, lon: 27.1 },
    postalCode: "98530",
    postalOffice: "Pyhätunturi",
    type: { code: 9, id: 9, name: "Kävelyreitti", slug: "walking-trail" },
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
      <button type="button" onClick={() => focusParkOnHome("punkaharju")}>
        focus-punkaharju
      </button>
    </>
  );
};

describe("ParkExplorer", () => {
  beforeEach(() => {
    pathnameState.value = "/";
    searchParamsState.value = "";
    replaceMock.mockReset();
  });

  it("activates a filter from the map query param and clears it from the url", () => {
    pathnameState.value = "/parks";
    searchParamsState.value = "filter=national-park";

    render(<ParkExplorer parks={parks} />);

    expect(screen.getByText("count:2")).toBeInTheDocument();
    expect(screen.getByText("reset:1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "home.filters.nationalParks" })).toHaveClass(
      "text-primary-foreground",
    );
    expect(replaceMock).toHaveBeenCalledWith("/parks", { scroll: false });
  });

  it("maps legacy hiking area query params to the combined category filter", () => {
    pathnameState.value = "/parks";
    searchParamsState.value = "filter=hiking-area";

    render(<ParkExplorer parks={parks} />);

    expect(screen.getByText("count:1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "home.filters.hikingAndWildernessAreas" }),
    ).toHaveClass("text-primary-foreground");
    expect(replaceMock).toHaveBeenCalledWith("/parks", { scroll: false });
  });

  it("ignores legacy individual trail query params", () => {
    pathnameState.value = "/parks";
    searchParamsState.value = "filter=nature-trail";

    render(<ParkExplorer parks={parks} />);

    expect(screen.getByText("count:4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "home.filters.areas" })).toHaveClass(
      "text-primary-foreground",
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("enables map admin quick actions for authenticated users", () => {
    mockUseAuth.mockReturnValueOnce({
      isAuthenticated: true,
      isLoading: false,
    });

    render(<ParkExplorer parks={parks} />);

    expect(screen.getByText("admin:true")).toBeInTheDocument();
  });

  it("defaults to areas filter excluding trails and shows all parks when all is selected", async () => {
    render(<ParkExplorer parks={parks} />);

    expect(screen.getByText("count:4")).toBeInTheDocument();
    expect(screen.getByText("admin:false")).toBeInTheDocument();
    expect(screen.getByText("Verlan tehdaskylä")).toBeInTheDocument();
    expect(screen.queryByText("Punkaharjun luontopolku")).not.toBeInTheDocument();
    expect(screen.queryByText("Nuuksion vaellusreitti")).not.toBeInTheDocument();
    expect(screen.queryByText("Pyhän kävelyreitti")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "home.filters.all" }));

    expect(screen.getByText("count:7")).toBeInTheDocument();
    expect(screen.getByText("Verlan tehdaskylä")).toBeInTheDocument();
    expect(screen.getByText("Punkaharjun luontopolku")).toBeInTheDocument();
    expect(screen.getByText("Nuuksion vaellusreitti")).toBeInTheDocument();
    expect(screen.getByText("Pyhän kävelyreitti")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "home.filters.natureTrails" }));

    expect(screen.getByText("count:3")).toBeInTheDocument();
    expect(screen.getByText("Punkaharjun luontopolku")).toBeInTheDocument();
    expect(screen.getByText("Nuuksion vaellusreitti")).toBeInTheDocument();
    expect(screen.getByText("Pyhän kävelyreitti")).toBeInTheDocument();
  });

  it("shows factory villages in their own filter while keeping them in the areas group", () => {
    render(<ParkExplorer parks={parks} />);

    expect(screen.getByText("count:4")).toBeInTheDocument();
    expect(screen.getByText("Verlan tehdaskylä")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "home.filters.factoryVillages" }));

    expect(screen.getByText("count:1")).toBeInTheDocument();
    expect(screen.getByText("Verlan tehdaskylä")).toBeInTheDocument();
    expect(screen.queryByText("Päijänteen kansallispuisto")).not.toBeInTheDocument();
    expect(screen.queryByText("Nuuksion vaellusreitti")).not.toBeInTheDocument();
  });

  it("shows visited filters for all users when visit history is public", () => {
    render(<ParkExplorer parks={parks} />);

    expect(screen.getByRole("button", { name: "home.filters.visited" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "home.filters.notVisited" })).toBeInTheDocument();
  });

  it("filters visible parks by visited and not-visited status", () => {
    render(<ParkExplorer parks={parks} />);

    fireEvent.click(screen.getByRole("button", { name: "home.filters.visited" }));
    expect(screen.getByText("count:2")).toBeInTheDocument();
    expect(screen.getByText("Päijänteen kansallispuisto")).toBeInTheDocument();
    expect(screen.getByText("Nuuksion vaellusreitti")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "home.filters.notVisited" }));
    expect(screen.getByText("count:5")).toBeInTheDocument();
    expect(screen.queryByText("Päijänteen kansallispuisto")).not.toBeInTheDocument();
    expect(screen.queryByText("Nuuksion vaellusreitti")).not.toBeInTheDocument();
    expect(screen.getByText("Verlan tehdaskylä")).toBeInTheDocument();
    expect(screen.getByText("Pyhän kävelyreitti")).toBeInTheDocument();
  });

  it("renders desktop filters as a floating vertical overlay on the left", () => {
    const { container } = render(<ParkExplorer parks={parks} />);

    const desktopSidebar = container.querySelector("aside");

    expect(desktopSidebar).toBeInTheDocument();
    expect(desktopSidebar).toHaveClass("absolute", "left-4", "w-40", "md:top-4");

    const buttons = within(desktopSidebar as HTMLElement).getAllByRole("button");

    expect(buttons).toHaveLength(10);
    expect(buttons[0]).toHaveTextContent("home.filters.all");
    expect(buttons[1]).toHaveTextContent("home.filters.areas");
    expect(buttons[2]).toHaveTextContent("home.filters.nationalParks");
    expect(buttons[3]).toHaveTextContent("home.filters.hikingAndWildernessAreas");
    expect(buttons[6]).toHaveTextContent("home.filters.factoryVillages");
    expect(buttons[7]).toHaveTextContent("home.filters.natureTrails");
  });

  it("stops mousedown propagation inside the filter panel", () => {
    render(<ParkExplorer parks={parks} />);

    const mousedownSpy = vi.fn();
    document.addEventListener("mousedown", mousedownSpy);

    const filterPanel = document.querySelector("#park-map-filters-mobile");
    fireEvent.mouseDown(
      within(filterPanel as HTMLElement).getByRole("button", { name: "home.filters.all" }),
    );

    expect(mousedownSpy).not.toHaveBeenCalled();

    document.removeEventListener("mousedown", mousedownSpy);
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
        name: "home.filters.hikingAndWildernessAreas",
      }),
    );

    expect(mobileFilters).toHaveClass("hidden");
    expect(screen.getByText("count:1")).toBeInTheDocument();
    expect(screen.getByText("reset:1")).toBeInTheDocument();
  });

  it("resets filters so a focused park from the header search stays visible on the map", () => {
    render(
      <HomeMapControlsProvider>
        <MobileFilterToggleHarness />
        <ParkExplorer parks={parks} />
      </HomeMapControlsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "home.filters.hikingAndWildernessAreas" }));

    expect(screen.getByText("count:1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "focus-teijo" }));

    expect(screen.getByText("count:4")).toBeInTheDocument();
    expect(screen.getByText("focus:teijo")).toBeInTheDocument();
  });

  it("switches to the trails filter when header search focuses a trail", () => {
    render(
      <HomeMapControlsProvider>
        <MobileFilterToggleHarness />
        <ParkExplorer parks={parks} />
      </HomeMapControlsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "home.filters.hikingAndWildernessAreas" }));

    expect(screen.getByText("count:1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "focus-punkaharju" }));

    expect(screen.getByText("count:3")).toBeInTheDocument();
    expect(screen.getByText("focus:punkaharju")).toBeInTheDocument();
    expect(screen.getByText("Punkaharjun luontopolku")).toBeInTheDocument();
    expect(screen.getByText("reset:1")).toBeInTheDocument();
  });

  it("does not trigger a map reset when search-driven focus changes the filter", () => {
    render(
      <HomeMapControlsProvider>
        <MobileFilterToggleHarness />
        <ParkExplorer parks={parks} />
      </HomeMapControlsProvider>,
    );

    expect(screen.getByText("count:4")).toBeInTheDocument();
    expect(screen.getByText("reset:0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "focus-punkaharju" }));

    expect(screen.getByText("count:3")).toBeInTheDocument();
    expect(screen.getByText("reset:0")).toBeInTheDocument();
  });

  it("triggers a map reset when filter changes and no park is selected", () => {
    render(<ParkExplorer parks={parks} />);

    expect(screen.getByText("reset:0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "home.filters.all" }));

    expect(screen.getByText("reset:1")).toBeInTheDocument();
  });

  it("does not trigger a map reset when filter changes while a park is selected", () => {
    render(<ParkExplorer parks={parks} />);

    fireEvent.click(screen.getByRole("button", { name: "mock-select-park" }));
    fireEvent.click(screen.getByRole("button", { name: "home.filters.all" }));

    expect(screen.getByText("reset:0")).toBeInTheDocument();
  });

  it("triggers a map reset once the selected park is cleared and filter changes again", () => {
    render(<ParkExplorer parks={parks} />);

    fireEvent.click(screen.getByRole("button", { name: "mock-select-park" }));
    fireEvent.click(screen.getByRole("button", { name: "home.filters.all" }));

    expect(screen.getByText("reset:0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "mock-clear-park" }));
    fireEvent.click(screen.getByRole("button", { name: "home.filters.nationalParks" }));

    expect(screen.getByText("reset:1")).toBeInTheDocument();
  });
});
