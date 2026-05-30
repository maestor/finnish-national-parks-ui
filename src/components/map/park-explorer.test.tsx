import type { MapPark } from "@/lib/parks";
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
    parks: MapPark[];
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

const parks: MapPark[] = [
  {
    slug: "paijanne",
    name: "Päijänteen kansallispuisto",
    areaKm2: 14,
    location: "Päijät-Häme",
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
    location: "Varsinais-Suomi",
    logo: {
      key: "teijo-logo",
      updatedAt: "2024-01-01T00:00:00Z",
      url: "https://example.com/teijo-logo.png",
    },
    luontoonUrl: null,
    map: null,
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
    location: "Pohjois-Pohjanmaa",
    logo: null,
    luontoonUrl: null,
    map: {
      key: "syote-map",
      updatedAt: "2024-01-01T00:00:00Z",
      url: "https://example.com/syote-map.pdf",
    },
    establishmentYear: null,
    boundingBox: { minLat: 65, minLon: 28, maxLat: 66, maxLon: 29 },
    markerPoint: { lat: 65.5, lon: 28.5 },
    type: { code: 2, id: 2, name: "Valtion retkeilyalue", slug: "state-hiking-area" },
    visitedSummary: { visited: false, visitCount: 0, lastVisitedOn: null },
  },
  {
    slug: "punkaharju",
    name: "Punkaharjun luontopolku",
    areaKm2: null,
    location: "Savonlinna",
    logo: null,
    luontoonUrl: null,
    map: null,
    establishmentYear: null,
    boundingBox: { minLat: 61, minLon: 29, maxLat: 62, maxLon: 30 },
    markerPoint: { lat: 61.8, lon: 29.3 },
    type: { code: 6, id: 6, name: "Luontopolku", slug: "nature-trail" },
    visitedSummary: { visited: false, visitCount: 0, lastVisitedOn: null },
  },
  {
    slug: "nuuksio",
    name: "Nuuksion vaellusreitti",
    areaKm2: null,
    location: "Espoo",
    logo: null,
    luontoonUrl: null,
    map: null,
    establishmentYear: null,
    boundingBox: { minLat: 60, minLon: 24, maxLat: 61, maxLon: 25 },
    markerPoint: { lat: 60.3, lon: 24.5 },
    type: { code: 7, id: 7, name: "Vaellusreitti", slug: "hiking-trail" },
    visitedSummary: { visited: true, visitCount: 2, lastVisitedOn: "2024-07-20" },
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

  it("enables map admin quick actions for authenticated users", () => {
    mockUseAuth.mockReturnValueOnce({
      isAuthenticated: true,
      isLoading: false,
    });

    render(<ParkExplorer parks={parks} />);

    expect(screen.getByText("admin:true")).toBeInTheDocument();
  });

  it("filters the visible parks by selected type, with all excluding trails", async () => {
    render(<ParkExplorer parks={parks} />);

    expect(screen.getByText("count:3")).toBeInTheDocument();
    expect(screen.getByText("admin:false")).toBeInTheDocument();
    expect(screen.queryByText("Punkaharjun luontopolku")).not.toBeInTheDocument();
    expect(screen.queryByText("Nuuksion vaellusreitti")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "home.filters.natureTrails" }));

    expect(screen.getByText("count:2")).toBeInTheDocument();
    expect(screen.getByText("Punkaharjun luontopolku")).toBeInTheDocument();
    expect(screen.getByText("Nuuksion vaellusreitti")).toBeInTheDocument();
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
    expect(screen.getByText("count:3")).toBeInTheDocument();
    expect(screen.queryByText("Päijänteen kansallispuisto")).not.toBeInTheDocument();
    expect(screen.queryByText("Nuuksion vaellusreitti")).not.toBeInTheDocument();
  });

  it("filters visible parks by logo and map availability", () => {
    render(<ParkExplorer parks={parks} />);

    fireEvent.click(screen.getByRole("button", { name: "home.filters.hasLogo" }));
    expect(screen.getByText("count:2")).toBeInTheDocument();
    expect(screen.getByText("Päijänteen kansallispuisto")).toBeInTheDocument();
    expect(screen.getByText("Teijon kansallispuisto")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "home.filters.hasMap" }));
    expect(screen.getByText("count:2")).toBeInTheDocument();
    expect(screen.getByText("Päijänteen kansallispuisto")).toBeInTheDocument();
    expect(screen.getByText("Iso-Syötteen retkeilyalue")).toBeInTheDocument();
  });

  it("renders desktop filters as a floating vertical overlay on the left", () => {
    const { container } = render(<ParkExplorer parks={parks} />);

    const desktopSidebar = container.querySelector("aside");

    expect(desktopSidebar).toBeInTheDocument();
    expect(desktopSidebar).toHaveClass("absolute", "left-4", "w-40", "md:top-4");

    const buttons = within(desktopSidebar as HTMLElement).getAllByRole("button");

    expect(buttons).toHaveLength(11);
    expect(buttons[0]).toHaveTextContent("home.filters.all");
    expect(buttons[1]).toHaveTextContent("home.filters.nationalParks");
    expect(buttons[6]).toHaveTextContent("home.filters.natureTrails");
    expect(buttons[9]).toHaveTextContent("home.filters.hasLogo");
    expect(buttons[10]).toHaveTextContent("home.filters.hasMap");
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
        name: "home.filters.hikingAreas",
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

    fireEvent.click(screen.getByRole("button", { name: "home.filters.hikingAreas" }));

    expect(screen.getByText("count:1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "focus-teijo" }));

    expect(screen.getByText("count:3")).toBeInTheDocument();
    expect(screen.getByText("focus:teijo")).toBeInTheDocument();
  });

  it("switches to the trails filter when header search focuses a trail", () => {
    render(
      <HomeMapControlsProvider>
        <MobileFilterToggleHarness />
        <ParkExplorer parks={parks} />
      </HomeMapControlsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "home.filters.hikingAreas" }));

    expect(screen.getByText("count:1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "focus-punkaharju" }));

    expect(screen.getByText("count:2")).toBeInTheDocument();
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

    expect(screen.getByText("count:3")).toBeInTheDocument();
    expect(screen.getByText("reset:0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "focus-punkaharju" }));

    expect(screen.getByText("count:2")).toBeInTheDocument();
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
