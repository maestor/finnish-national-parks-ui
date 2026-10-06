import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPublicVisitsTimelineModel,
  buildVisitedMagnetParksModel,
  type FrontendTimelineVisit,
  type PublicVisitsMagnetSummaryPark,
  type PublicVisitsMapMarker,
  type PublicVisitsView,
} from "@/lib/public-visits";
import { PublicVisitsTimeline } from "./public-visits-timeline";

const timelineObservers: Array<{
  callback: IntersectionObserverCallback;
  disconnect: ReturnType<typeof vi.fn>;
  observe: ReturnType<typeof vi.fn>;
}> = [];

const intersectTimelineEnd = (isIntersecting = true) => {
  const observer = timelineObservers[timelineObservers.length - 1];
  if (!observer) throw new Error("No timeline observer is active");
  act(() =>
    observer.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
};

vi.mock("@/components/visits/lazy-visits-map", () => ({
  LazyVisitsMap: ({
    markers,
    selectedYear,
  }: {
    markers: PublicVisitsMapMarker[];
    selectedYear?: number | null;
  }) => (
    <div data-testid="visits-map">
      markers:{markers.length}|year:{selectedYear ?? "all"}
    </div>
  ),
}));

// Mirrors the server page: the timeline model is built server-side and the
// client component receives only the slim view model, not the raw visits.
const renderTimeline = (
  visits: FrontendTimelineVisit[],
  selection: { selectedYear: number | null; selectedMonth: number | null },
  extras?: {
    view?: PublicVisitsView;
    mapMarkers?: PublicVisitsMapMarker[];
    magnetSummaryParks?: PublicVisitsMagnetSummaryPark[];
  },
) => {
  const model = buildPublicVisitsTimelineModel(visits, selection);
  const magnetParksModel = extras?.magnetSummaryParks
    ? buildVisitedMagnetParksModel(visits, extras.magnetSummaryParks)
    : undefined;

  return render(
    <PublicVisitsTimeline
      availableYears={model.availableYears}
      filteredCount={model.filteredVisits.length}
      monthOptions={model.monthOptions}
      sections={model.sections}
      selectedMonth={model.selectedMonth}
      selectedYear={model.selectedYear}
      totalCount={visits.length}
      view={extras?.view}
      mapMarkers={extras?.mapMarkers}
      magnetParksModel={magnetParksModel}
    />,
  );
};

const { mockPush } = vi.hoisted(() => ({
  mockPush: vi.fn(),
}));

const mockScrollTo = vi.fn();

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

const setMagnetSectionScrollPositions = ({
  missingTop,
  missingHeight = 240,
  nationalParksTop,
  nationalParksHeight = 240,
  navBottom,
  otherPlacesTop,
  otherPlacesHeight = 240,
}: {
  missingTop: number;
  missingHeight?: number;
  nationalParksTop: number;
  nationalParksHeight?: number;
  navBottom: number;
  otherPlacesTop: number;
  otherPlacesHeight?: number;
}) => {
  const navigation = screen.getByRole("navigation", {
    name: "visits.parks.sectionNavigationLabel",
  });
  const nationalParksSection = screen.getByRole("region", {
    name: "visits.parks.sections.nationalParks",
  });
  const otherPlacesSection = screen.getByRole("region", {
    name: "visits.parks.sections.otherPlaces",
  });
  const missingSection = screen.getByRole("region", {
    name: "visits.parks.sections.missing",
  });

  navigation.getBoundingClientRect = () => createRect(navBottom - 40, 40);
  nationalParksSection.getBoundingClientRect = () =>
    createRect(nationalParksTop, nationalParksHeight);
  otherPlacesSection.getBoundingClientRect = () => createRect(otherPlacesTop, otherPlacesHeight);
  missingSection.getBoundingClientRect = () => createRect(missingTop, missingHeight);
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("PublicVisitsTimeline", () => {
  beforeEach(() => {
    timelineObservers.length = 0;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          timelineObservers.push({ callback, disconnect: this.disconnect, observe: this.observe });
        }
        disconnect = vi.fn();
        observe = vi.fn();
        unobserve = vi.fn();
      },
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T09:00:00Z"));
    mockPush.mockReset();
    mockScrollTo.mockReset();
    setWindowScrollY(0);

    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: mockScrollTo,
      writable: true,
    });

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
      writable: true,
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

  it("loads opening thumbnails eagerly in standalone and trip visits without changing their details", () => {
    renderTimeline(
      [
        {
          ...visits[0],
          featuredImage: { url: "https://example.test/loose-thumb.jpg" },
          imageCount: 1,
        },
        {
          ...visits[1],
          featuredImage: { url: "https://example.test/trip-thumb.jpg" },
          trip: { id: 7, name: "Kesäretki", slug: "kesaretki" },
        },
        visits[2],
      ],
      { selectedYear: null, selectedMonth: null },
    );
    const looseLink = screen.getByRole("link", { name: /Nuuksio/ });
    const tripLink = screen.getByRole("link", { name: /Pallas-Yllastunturi/ });
    expect(within(looseLink).getByAltText("")).toHaveAttribute(
      "src",
      "https://example.test/loose-thumb.jpg",
    );
    expect(within(tripLink).getByAltText("")).toHaveAttribute(
      "src",
      "https://example.test/trip-thumb.jpg",
    );
    expect(within(looseLink).getByAltText("")).toHaveAttribute("loading", "eager");
    expect(within(tripLink).getByAltText("")).toHaveAttribute("loading", "eager");
    expect(looseLink).toHaveAttribute("href", "/paikka/nuuksio?visit=1#visit-history");
    expect(looseLink.parentElement).toHaveTextContent("Punarinnankierros");
    expect(screen.getAllByAltText("")).toHaveLength(2);
    for (const [link, date] of [
      [looseLink, "15.6.2024"],
      [tripLink, "10.8.2024"],
    ] as const) {
      const imageSurface = within(link).getByAltText("").parentElement;
      if (!imageSurface) throw new Error("Missing visit image surface");
      expect(within(imageSurface).getByText(date)).toBeVisible();
      expect(within(link).getByText("visits.item.viewVisit")).toHaveClass("sr-only");
      expect(link).toHaveAccessibleName(/visits\.item\.viewVisit/);
      expect(link).toHaveAttribute("title", "visits.item.viewVisit");
      const imageCount = within(imageSurface).getByLabelText("visits.item.imageCount");
      expect(imageCount).toHaveTextContent("1");
      expect(
        within(link.closest("li") as HTMLElement).getAllByLabelText("visits.item.imageCount"),
      ).toHaveLength(1);
      expect(within(link).getAllByText(date)).toHaveLength(1);
      expect(imageSurface).not.toContainElement(within(link).getByRole("heading"));
    }
    const imagelessLink = screen.getByRole("link", { name: /Oulanka/ });
    expect(within(imagelessLink).getByText("5.2.2025")).toBeVisible();
    expect(within(imagelessLink).getByText("visits.item.viewVisit")).toHaveClass("sr-only");
    expect(imagelessLink).toHaveAccessibleName(/visits\.item\.viewVisit/);
    expect(imagelessLink).toHaveAttribute("title", "visits.item.viewVisit");
  });

  it("shares the opening image budget across standalone visits, trips and appended batches", () => {
    const imageVisits = Array.from({ length: 15 }, (_, index) => ({
      ...visits[0],
      id: index + 100,
      visitedOn: `2024-06-${String(30 - index).padStart(2, "0")}`,
      featuredImage: { url: `https://example.test/visit-${index}.jpg` },
      imageCount: 1,
      trip: index >= 1 && index <= 3 ? { id: 7, name: "Kesäretki", slug: "kesaretki" } : null,
      park: { ...visits[0].park, name: `Paikka ${index}`, slug: `paikka-${index}` },
    }));
    renderTimeline([visits[2], ...imageVisits], { selectedYear: null, selectedMonth: null });

    const loadingModes = () =>
      screen.getAllByAltText("").map((image) => image.getAttribute("loading"));
    expect(loadingModes()).toEqual(["eager", "eager", ...Array(11).fill("lazy")]);

    intersectTimelineEnd();
    expect(loadingModes()).toEqual(["eager", "eager", ...Array(13).fill("lazy")]);
  });

  it("automatically appends chronological batches without splitting trips or moving focus", () => {
    const manyVisits = Array.from({ length: 13 }, (_, index) => ({
      ...visits[0],
      id: index + 100,
      visitedOn: `2024-06-${String(30 - index).padStart(2, "0")}`,
      park: { ...visits[0].park, name: `Paikka ${index}`, slug: `paikka-${index}` },
    }));
    const tripVisits = [0, 1].map((index) => ({
      ...visits[0],
      id: index + 200,
      visitedOn: "2023-05-01",
      park: { ...visits[0].park, name: `Retkipaikka ${index}`, slug: `retkipaikka-${index}` },
      trip: { id: 9, name: "Kevätretki", slug: "kevatretki" },
      tripStopOrder: index + 1,
    }));
    renderTimeline([...manyVisits, ...tripVisits], { selectedYear: null, selectedMonth: null });
    expect(screen.getByRole("link", { name: /Paikka 11/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Paikka 12/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Kevätretki")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "visits.timeline.showMore" }),
    ).not.toBeInTheDocument();
    screen.getByRole("link", { name: /Paikka 11/ }).focus();
    intersectTimelineEnd(false);
    expect(screen.queryByRole("link", { name: /Paikka 12/ })).not.toBeInTheDocument();
    intersectTimelineEnd();
    expect(screen.getByRole("link", { name: /Paikka 11/ })).toHaveFocus();
    expect(screen.getByRole("link", { name: /Retkipaikka 0/ })).toBeVisible();
    expect(screen.getByRole("link", { name: /Retkipaikka 1/ })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "visits.timeline.showMore" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("visits.timeline.loadedCount");
    expect(timelineObservers).toHaveLength(1);
    expect(timelineObservers[0]?.disconnect).toHaveBeenCalledOnce();
  });

  it("resets appended batches when year, month or view changes", () => {
    const manyVisits = Array.from({ length: 25 }, (_, index) => ({
      ...visits[0],
      id: index + 100,
      visitedOn: `2024-06-${String(30 - index).padStart(2, "0")}`,
      park: { ...visits[0].park, name: `Paikka ${index}`, slug: `paikka-${index}` },
    }));
    const model = buildPublicVisitsTimelineModel(manyVisits, {
      selectedYear: null,
      selectedMonth: null,
    });
    const props = {
      availableYears: model.availableYears,
      filteredCount: 25,
      monthOptions: model.monthOptions,
      sections: model.sections,
      selectedMonth: null,
      selectedYear: null,
      totalCount: 25,
    };
    const { rerender, unmount } = render(<PublicVisitsTimeline {...props} />);
    const initialObserver = timelineObservers[0];
    intersectTimelineEnd();
    expect(screen.getByRole("link", { name: /Paikka 23/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Paikka 24/ })).not.toBeInTheDocument();
    act(() =>
      initialObserver?.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(screen.queryByRole("link", { name: /Paikka 24/ })).not.toBeInTheDocument();
    expect(initialObserver?.disconnect).toHaveBeenCalledOnce();
    intersectTimelineEnd();
    expect(screen.getByRole("link", { name: /Paikka 24/ })).toBeVisible();
    rerender(<PublicVisitsTimeline {...props} selectedYear={2024} />);
    expect(screen.queryByRole("link", { name: /Paikka 12/ })).not.toBeInTheDocument();
    intersectTimelineEnd();
    rerender(<PublicVisitsTimeline {...props} selectedYear={2024} selectedMonth={6} />);
    expect(screen.queryByRole("link", { name: /Paikka 12/ })).not.toBeInTheDocument();
    intersectTimelineEnd();
    rerender(<PublicVisitsTimeline {...props} selectedYear={2024} selectedMonth={6} view="map" />);
    expect(screen.getByTestId("visits-map")).toBeVisible();
    rerender(
      <PublicVisitsTimeline {...props} selectedYear={2024} selectedMonth={6} view="timeline" />,
    );
    expect(screen.queryByRole("link", { name: /Paikka 12/ })).not.toBeInTheDocument();
    const activeObserver = timelineObservers[timelineObservers.length - 1];
    unmount();
    expect(activeObserver?.disconnect).toHaveBeenCalledOnce();
  });

  const visits: [FrontendTimelineVisit, FrontendTimelineVisit, FrontendTimelineVisit] = [
    {
      id: 1,
      visitedOn: "2024-06-15",
      route: "Punarinnankierros",
      createdAt: "2024-06-15T10:00:00Z",
      featuredImage: null,
      imageCount: 0,
      trip: null,
      tripStopOrder: null,
      park: {
        name: "Nuuksio",
        slug: "nuuksio",
        typeLabel: "Kansallispuisto",
      },
    },
    {
      id: 2,
      visitedOn: "2024-08-10",
      route: null,
      createdAt: "2024-08-10T10:00:00Z",
      featuredImage: null,
      imageCount: 1,
      trip: null,
      tripStopOrder: null,
      park: {
        name: "Pallas-Yllastunturi",
        slug: "pallas-yllastunturi",
        typeLabel: "Kansallispuisto",
      },
    },
    {
      id: 3,
      visitedOn: "2025-02-05",
      route: "Talvipolku",
      createdAt: "2025-02-05T10:00:00Z",
      featuredImage: null,
      imageCount: 0,
      trip: null,
      tripStopOrder: null,
      park: {
        name: "Oulanka",
        slug: "oulanka",
        typeLabel: "Kansallispuisto",
      },
    },
  ];

  const magnetSummaryParks: PublicVisitsMagnetSummaryPark[] = [
    {
      slug: "nuuksio",
      name: "Nuuksio",
      category: { name: "Kansallispuistot", slug: "national-park" },
      displayTypeName: null,
      hasMagnet: true,
      logo: {
        key: "nuuksio-logo",
        updatedAt: "2024-01-01T00:00:00Z",
        url: "https://example.com/nuuksio-logo.png",
      },
      type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
    },
    {
      slug: "pallas-yllastunturi",
      name: "Pallas-Yllastunturi",
      category: { name: "Kansallispuistot", slug: "national-park" },
      displayTypeName: null,
      hasMagnet: true,
      logo: null,
      type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
    },
    {
      slug: "kolovesi",
      name: "Kolovesi",
      category: { name: "Kansallispuistot", slug: "national-park" },
      displayTypeName: null,
      hasMagnet: true,
      logo: null,
      type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
    },
    {
      slug: "oulanka",
      name: "Oulanka",
      category: { name: "Kansallispuistot", slug: "national-park" },
      displayTypeName: null,
      hasMagnet: true,
      logo: null,
      type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
    },
    {
      slug: "seurasaari",
      name: "Seurasaari",
      category: { name: "Historia-alueet", slug: "cultural-history-area" },
      displayTypeName: null,
      hasMagnet: true,
      logo: null,
      type: { code: 2, id: 2, name: "Historiakohde", slug: "cultural-history-area" },
    },
    {
      slug: "teijo",
      name: "Teijo",
      category: { name: "Retkeilyalueet", slug: "outdoor-recreation-area" },
      displayTypeName: null,
      hasMagnet: true,
      logo: null,
      type: { code: 3, id: 3, name: "Retkeilyalue", slug: "outdoor-recreation-area" },
    },
  ];

  it("shows years from the first visit year through the current year", () => {
    renderTimeline(visits, { selectedYear: null, selectedMonth: null });

    const yearNav = screen.getByRole("navigation", { name: "visits.filters.yearsLabel" });
    const yearLinks = within(yearNav).getAllByRole("link");

    expect(yearLinks.map((link) => link.textContent)).toEqual([
      "visits.filters.all",
      "2026",
      "2025",
      "2024",
    ]);
    expect(screen.getByRole("link", { name: "2024" })).toHaveAttribute(
      "href",
      "/kaynnit?year=2024",
    );
    expect(screen.getByRole("link", { name: "2025" })).toHaveAttribute(
      "href",
      "/kaynnit?year=2025",
    );
    expect(screen.getByRole("link", { name: "2026" })).toHaveAttribute(
      "href",
      "/kaynnit?year=2026",
    );
  });

  it("shows all twelve month pills and disables months without visits", () => {
    renderTimeline(visits, { selectedYear: 2024, selectedMonth: null });

    const monthNav = screen.getByRole("navigation", { name: "visits.filters.monthsLabel" });
    const monthLinks = within(monthNav).getAllByRole("link");
    const januaryPillLabel = within(monthNav).getByText(/tammi/i);
    const januaryPill = januaryPillLabel.closest("[title]");
    const juneLink = within(monthNav).getByRole("link", { name: /kesä/i });
    const augustLink = within(monthNav).getByRole("link", { name: /elo/i });

    if (!(januaryPill instanceof HTMLElement)) {
      throw new Error("Expected disabled month pill container");
    }

    expect(within(monthNav).getByText(/joulu/i)).toBeInTheDocument();
    expect(monthLinks).toHaveLength(3);
    expect(
      within(monthNav).getByRole("link", { name: "visits.filters.allMonthsLabel" }),
    ).toHaveAttribute("href", "/kaynnit?year=2024");
    expect(juneLink).toHaveAttribute("href", "/kaynnit?year=2024&month=6");
    expect(augustLink).toHaveAttribute("href", "/kaynnit?year=2024&month=8");
    expect(januaryPill.closest("a")).toBeNull();
    expect(januaryPill).toHaveAttribute("title", "visits.filters.noVisitsInMonth");
    expect(januaryPill).toHaveTextContent("visits.filters.noVisitsInMonth");
  });

  it("renders compact mobile selects and limits month options to available months", () => {
    renderTimeline(visits, { selectedYear: 2024, selectedMonth: null });

    const yearSelect = screen.getByLabelText("visits.filters.yearSelectLabel");
    const monthSelect = screen.getByLabelText("visits.filters.monthSelectLabel");

    expect(yearSelect).toHaveValue("2024");
    expect(monthSelect).toHaveValue("");
    expect(
      within(yearSelect).getByRole("option", { name: "visits.filters.allYearsLabel" }),
    ).toBeInTheDocument();
    expect(
      within(monthSelect).getByRole("option", { name: "visits.filters.allMonthsLabel" }),
    ).toBeInTheDocument();
    expect(within(monthSelect).getByRole("option", { name: /kesäkuu/i })).toBeInTheDocument();
    expect(within(monthSelect).getByRole("option", { name: /elokuu/i })).toBeInTheDocument();
    expect(
      within(monthSelect).queryByRole("option", { name: /tammikuu/i }),
    ).not.toBeInTheDocument();
  });

  it("disables the mobile month select until a year is chosen", () => {
    renderTimeline(visits, { selectedYear: null, selectedMonth: null });

    const monthSelect = screen.getByLabelText("visits.filters.monthSelectLabel");

    expect(monthSelect).toBeDisabled();
    expect(
      within(monthSelect).getByRole("option", { name: "visits.filters.monthSelectPlaceholder" }),
    ).toBeInTheDocument();
  });

  it("navigates through the mobile selects when the user changes year or month", () => {
    renderTimeline(visits, { selectedYear: 2024, selectedMonth: null });

    fireEvent.change(screen.getByLabelText("visits.filters.yearSelectLabel"), {
      target: { value: "2025" },
    });
    expect(mockPush).toHaveBeenLastCalledWith("/kaynnit?year=2025", { scroll: false });

    fireEvent.change(screen.getByLabelText("visits.filters.monthSelectLabel"), {
      target: { value: "8" },
    });
    expect(mockPush).toHaveBeenLastCalledWith("/kaynnit?year=2024&month=8", {
      scroll: false,
    });

    fireEvent.change(screen.getByLabelText("visits.filters.monthSelectLabel"), {
      target: { value: "" },
    });
    expect(mockPush).toHaveBeenLastCalledWith("/kaynnit?year=2024", { scroll: false });
  });

  it("filters timeline items by selected year and month and links to the targeted visit", () => {
    renderTimeline(visits, { selectedYear: 2024, selectedMonth: 8 });

    expect(screen.getByRole("heading", { name: "2024" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /elokuu/i })).toBeInTheDocument();
    expect(screen.queryByText("Nuuksio")).not.toBeInTheDocument();

    const visitLink = screen.getByRole("link", {
      name: /Pallas-Yllastunturi/,
    });
    expect(visitLink).toHaveAttribute("href", "/paikka/pallas-yllastunturi?visit=2#visit-history");
    expect(visitLink).toHaveAccessibleName(/10\.8\.2024/);
    expect(visitLink).toHaveAccessibleName(/Pallas-Yllastunturi/);
    expect(visitLink).toHaveAccessibleName(/visits\.item\.viewVisit/);
  });

  it("shows the visible visit count inline with the filter title", () => {
    renderTimeline(visits, { selectedYear: 2024, selectedMonth: null });

    expect(screen.getByText("(2 visits.filters.visibleCount)")).toBeInTheDocument();
    expect(screen.queryByText("visits.summary.total")).not.toBeInTheDocument();
    expect(screen.queryByText("visits.summary.showing")).not.toBeInTheDocument();
  });

  it("alternates month cards on opposite sides of the centered timeline on desktop", () => {
    renderTimeline(visits, { selectedYear: null, selectedMonth: null });

    const juneCard = screen.getByText("Nuuksio").closest("li");
    const augustCard = screen.getByText("Pallas-Yllastunturi").closest("li");
    const juneHeading = screen.getByRole("heading", { name: /kesä/i }).closest("div");
    const augustHeading = screen.getByRole("heading", { name: /elo/i }).closest("div");

    if (
      !(juneCard instanceof HTMLElement) ||
      !(augustCard instanceof HTMLElement) ||
      !(juneHeading instanceof HTMLElement) ||
      !(augustHeading instanceof HTMLElement)
    ) {
      throw new Error("Expected timeline month layout containers");
    }

    expect(juneCard).toHaveClass("md:grid");
    expect(juneCard).toHaveClass("md:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)]");
    expect(juneCard).toHaveClass("md:pl-0");
    expect(augustCard).toHaveClass("md:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)]");
    expect(juneHeading).toHaveClass("md:col-start-1");
    expect(augustHeading).toHaveClass("md:col-start-3");
  });

  it("uses arrow down and up keys to move from years to months to visit cards", async () => {
    renderTimeline(visits, { selectedYear: 2024, selectedMonth: null });

    const yearLinks = within(
      screen.getByRole("navigation", { name: "visits.filters.yearsLabel" }),
    ).getAllByRole("link");
    const monthLinks = within(
      screen.getByRole("navigation", { name: "visits.filters.monthsLabel" }),
    ).getAllByRole("link");
    const visitLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.includes("#visit-history"));

    yearLinks[3]?.focus();
    expect(yearLinks[3]).toHaveFocus();

    fireEvent.keyDown(yearLinks[3], { key: "ArrowDown" });
    expect(monthLinks[0]).toHaveFocus();

    fireEvent.keyDown(monthLinks[0], { key: "ArrowDown" });
    expect(visitLinks[0]).toHaveFocus();

    fireEvent.keyDown(visitLinks[0], { key: "ArrowDown" });
    expect(visitLinks[1]).toHaveFocus();

    fireEvent.keyDown(visitLinks[1], { key: "ArrowUp" });
    expect(visitLinks[0]).toHaveFocus();

    fireEvent.keyDown(visitLinks[0], { key: "ArrowUp" });
    expect(monthLinks[0]).toHaveFocus();

    fireEvent.keyDown(monthLinks[0], { key: "ArrowUp" });
    expect(yearLinks[3]).toHaveFocus();
  });

  it("uses arrow left and right keys to move within year and month filters", () => {
    renderTimeline(visits, { selectedYear: 2024, selectedMonth: null });

    const yearLinks = within(
      screen.getByRole("navigation", { name: "visits.filters.yearsLabel" }),
    ).getAllByRole("link");
    const monthLinks = within(
      screen.getByRole("navigation", { name: "visits.filters.monthsLabel" }),
    ).getAllByRole("link");

    yearLinks[2]?.focus();
    expect(yearLinks[2]).toHaveFocus();

    fireEvent.keyDown(yearLinks[2], { key: "ArrowRight" });
    expect(yearLinks[3]).toHaveFocus();

    fireEvent.keyDown(yearLinks[3], { key: "ArrowLeft" });
    expect(yearLinks[2]).toHaveFocus();

    monthLinks[1]?.focus();
    expect(monthLinks[1]).toHaveFocus();

    fireEvent.keyDown(monthLinks[1], { key: "ArrowRight" });
    expect(monthLinks[2]).toHaveFocus();

    fireEvent.keyDown(monthLinks[2], { key: "ArrowLeft" });
    expect(monthLinks[1]).toHaveFocus();
  });

  it("ignores unavailable month query selections and keeps the year view active", () => {
    renderTimeline(visits, { selectedYear: 2024, selectedMonth: 1 });

    expect(screen.getByRole("link", { name: "visits.filters.allMonthsLabel" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("heading", { name: "2024" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /elo/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /kesä/i })).toBeInTheDocument();
    expect(screen.queryByText("visits.empty.filtered")).not.toBeInTheDocument();
  });

  it("shows a continuous month spine with the park type as the first detail badge", () => {
    renderTimeline(visits, { selectedYear: null, selectedMonth: null });

    const nuuksioVisitItem = screen.getByRole("heading", { name: "Nuuksio" }).closest("li");
    const monthTimeline = nuuksioVisitItem?.closest("ol");
    const imageBadge = screen.getByLabelText("visits.item.imageCount");
    const routeBadge = screen.getByText("Punarinnankierros");

    if (!(monthTimeline instanceof HTMLElement) || !(nuuksioVisitItem instanceof HTMLElement)) {
      throw new Error("Expected timeline list and Nuuksio visit item");
    }

    const parkTypeBadge = within(nuuksioVisitItem).getByText("Kansallispuisto");

    expect(monthTimeline).toHaveClass("before:absolute");
    expect(parkTypeBadge.compareDocumentPosition(routeBadge)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(imageBadge).toHaveTextContent("1");
    expect(screen.queryByLabelText("visits.item.note")).not.toBeInTheDocument();
  });

  it("shows the park type badge in the shared detail badge row when metadata is available", () => {
    renderTimeline(visits, { selectedYear: null, selectedMonth: null });

    const nuuksioVisitItem = screen.getByRole("heading", { name: "Nuuksio" }).closest("li");

    if (!(nuuksioVisitItem instanceof HTMLElement)) {
      throw new Error("Expected Nuuksio visit item");
    }

    const badgeRow = screen.getByText("Punarinnankierros").parentElement;

    if (!(badgeRow instanceof HTMLElement)) {
      throw new Error("Expected visit badge row");
    }

    expect(badgeRow).toHaveClass("mt-3", "flex", "flex-wrap", "gap-2");
    expect(within(badgeRow).getByText("Kansallispuisto")).toBeInTheDocument();
  });

  it("uses centered mobile month headers and aligns the mobile spine with visit markers", () => {
    renderTimeline(visits, { selectedYear: null, selectedMonth: null });

    const timelineWrapper = screen.getByRole("heading", { name: "2025" }).closest("div")
      ?.parentElement?.parentElement;
    const monthHeadingRow = screen.getByRole("heading", { name: /helmi/i }).parentElement;
    const firstVisitItem = screen.getByText("Oulanka").closest("li");
    const firstVisitMarker = firstVisitItem?.querySelector("div.pointer-events-none");

    if (
      !(timelineWrapper instanceof HTMLElement) ||
      !(monthHeadingRow instanceof HTMLElement) ||
      !(firstVisitItem instanceof HTMLElement) ||
      !(firstVisitMarker instanceof HTMLElement)
    ) {
      throw new Error("Expected mobile timeline layout elements");
    }

    expect(timelineWrapper).toHaveClass("before:left-4");
    expect(monthHeadingRow).toHaveClass("pl-12");
    expect(monthHeadingRow).toHaveClass("pr-4");
    expect(monthHeadingRow).toHaveClass("md:px-0");
    expect(firstVisitItem).toHaveClass("pl-12");
    expect(firstVisitMarker).toHaveClass("left-4");
    expect(firstVisitMarker).toHaveClass("-translate-x-1/2");
  });

  it("renders a centered back-to-top button at the end of the timeline and scrolls smoothly", () => {
    renderTimeline(visits, { selectedYear: null, selectedMonth: null });

    const backToTopButton = screen.getByRole("button", { name: "visits.backToTop" });
    const backToTopRow = backToTopButton.parentElement;
    const timelineWrapper = backToTopRow?.parentElement;

    if (!(backToTopRow instanceof HTMLElement) || !(timelineWrapper instanceof HTMLElement)) {
      throw new Error("Expected back-to-top row and timeline wrapper");
    }

    expect(backToTopRow).toHaveClass("pl-12");
    expect(backToTopRow).toHaveClass("pr-4");
    expect(backToTopRow).toHaveClass("md:px-0");
    expect(timelineWrapper).toHaveClass("md:before:bottom-13");

    fireEvent.click(backToTopButton);

    expect(mockScrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("shows an empty state when a selected year has no visits yet", () => {
    renderTimeline(visits, { selectedYear: 2026, selectedMonth: null });

    expect(screen.getByText("visits.empty.filtered")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "visits.filters.reset" })).toHaveAttribute(
      "href",
      "/kaynnit",
    );
  });

  it("shows the view toggle with links that preserve the active filters", () => {
    renderTimeline(visits, { selectedYear: 2024, selectedMonth: 6 });

    const viewNav = screen.getByRole("navigation", { name: "visits.views.label" });
    const timelineLink = within(viewNav).getByRole("link", { name: "visits.views.timeline" });
    const mapLink = within(viewNav).getByRole("link", { name: "visits.views.map" });

    expect(timelineLink).toHaveAttribute("href", "/kaynnit?year=2024&month=6");
    expect(timelineLink).toHaveAttribute("aria-current", "page");
    expect(mapLink).toHaveAttribute("href", "/kaynnit?year=2024&view=map");
    expect(mapLink).not.toHaveAttribute("aria-current");
  });

  it("renders the map instead of the timeline sections when the map view is active", () => {
    const mapMarkers: PublicVisitsMapMarker[] = [
      {
        slug: "nuuksio",
        name: "Nuuksio",
        coordinates: { lat: 60.3, lon: 24.5 },
        visitCount: 1,
        years: [2024],
      },
    ];

    renderTimeline(
      visits,
      { selectedYear: 2024, selectedMonth: null },
      {
        view: "map",
        mapMarkers,
      },
    );

    expect(screen.getByTestId("visits-map")).toHaveTextContent("markers:1|year:2024");
    expect(screen.queryByRole("heading", { name: "2024" })).not.toBeInTheDocument();
    expect(screen.queryByText("Nuuksio")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "visits.filters.monthsLabel" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("visits.filters.monthSelectLabel")).not.toBeInTheDocument();

    const viewNav = screen.getByRole("navigation", { name: "visits.views.label" });
    expect(within(viewNav).getByRole("link", { name: "visits.views.map" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(viewNav).getByRole("link", { name: "visits.views.timeline" })).toHaveAttribute(
      "href",
      "/kaynnit?year=2024",
    );
  });

  it("keeps the map view in the year filters and hides month filters", () => {
    const mapMarkers: PublicVisitsMapMarker[] = [
      {
        slug: "nuuksio",
        name: "Nuuksio",
        coordinates: { lat: 60.3, lon: 24.5 },
        visitCount: 1,
        years: [2024],
      },
    ];

    renderTimeline(
      visits,
      { selectedYear: 2024, selectedMonth: null },
      {
        view: "map",
        mapMarkers,
      },
    );

    expect(screen.getByRole("link", { name: "2025" })).toHaveAttribute(
      "href",
      "/kaynnit?year=2025&view=map",
    );
    expect(screen.getByRole("link", { name: "visits.filters.allYearsLabel" })).toHaveAttribute(
      "href",
      "/kaynnit?view=map",
    );

    expect(
      screen.queryByRole("navigation", { name: "visits.filters.monthsLabel" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("visits.filters.monthSelectLabel")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("visits.filters.yearSelectLabel"), {
      target: { value: "2025" },
    });
    expect(mockPush).toHaveBeenLastCalledWith("/kaynnit?year=2025&view=map", {
      scroll: false,
    });
  });

  it("renders the magnets view with national parks first and other magnet places below", () => {
    renderTimeline(
      [
        {
          id: 1,
          visitedOn: "2024-06-15",
          route: "Punarinnankierros",
          createdAt: "2024-06-15T10:00:00Z",
          featuredImage: null,
          imageCount: 0,
          trip: null,
          tripStopOrder: null,
          park: {
            name: "Nuuksio",
            slug: "nuuksio",
            typeLabel: "Kansallispuisto",
          },
        },
        {
          id: 2,
          visitedOn: "2025-07-15",
          route: null,
          createdAt: "2025-07-15T10:00:00Z",
          featuredImage: null,
          imageCount: 1,
          trip: null,
          tripStopOrder: null,
          park: {
            name: "Nuuksio",
            slug: "nuuksio",
            typeLabel: "Kansallispuisto",
          },
        },
        {
          id: 3,
          visitedOn: "2024-08-10",
          route: null,
          createdAt: "2024-08-10T10:00:00Z",
          featuredImage: null,
          imageCount: 1,
          trip: null,
          tripStopOrder: null,
          park: {
            name: "Pallas-Yllastunturi",
            slug: "pallas-yllastunturi",
            typeLabel: "Kansallispuisto",
          },
        },
        {
          id: 4,
          visitedOn: "2026-01-05",
          route: null,
          createdAt: "2026-01-05T10:00:00Z",
          featuredImage: null,
          imageCount: 0,
          trip: null,
          tripStopOrder: null,
          park: {
            name: "Seurasaari",
            slug: "seurasaari",
            typeLabel: "Historiakohde",
          },
        },
      ],
      { selectedYear: null, selectedMonth: null },
      {
        view: "parks",
        magnetSummaryParks,
      },
    );

    const viewNav = screen.getByRole("navigation", { name: "visits.views.label" });
    expect(within(viewNav).getByRole("link", { name: "visits.views.parks" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(viewNav).getByRole("link", { name: "visits.views.timeline" })).toHaveAttribute(
      "href",
      "/kaynnit",
    );
    expect(within(viewNav).getByRole("link", { name: "visits.views.map" })).toHaveAttribute(
      "href",
      "/kaynnit?view=map",
    );

    expect(
      screen.queryByRole("navigation", { name: "visits.filters.yearsLabel" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("visits.filters.yearSelectLabel")).not.toBeInTheDocument();
    expect(screen.queryByText("visits.filters.title")).not.toBeInTheDocument();

    expect(
      screen.getByRole("progressbar", { name: "visits.parks.summary.totalProgressLabel" }),
    ).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByText("3 / 6")).toBeInTheDocument();
    expect(screen.getByText("visits.parks.summary.firstPark")).toBeInTheDocument();
    expect(screen.getByText("visits.parks.summary.latestPark")).toBeInTheDocument();
    expect(screen.getByText("visits.parks.otherPlaces.progressLabel")).toBeInTheDocument();
    expect(screen.queryByText("visits.parks.summary.progressSuffix")).not.toBeInTheDocument();
    expect(screen.queryByText("visits.parks.summary.progressMeta")).not.toBeInTheDocument();
    expect(screen.getByText("visits.parks.summary.title")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "visits.parks.sections.nationalParks" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "visits.parks.sections.otherPlaces" }),
    ).toBeInTheDocument();
    const sectionNavigation = screen.getByRole("navigation", {
      name: "visits.parks.sectionNavigationLabel",
    });
    expect(
      within(sectionNavigation).getByRole("link", { name: "visits.parks.sections.nationalParks" }),
    ).toHaveAttribute("href", "#magneettijahti-kansallispuistot");
    expect(
      within(sectionNavigation).getByRole("link", { name: "visits.parks.sections.otherPlaces" }),
    ).toHaveAttribute("href", "#magneettijahti-muut-paikat");
    expect(
      within(sectionNavigation).getByRole("link", { name: "visits.parks.sections.missing" }),
    ).toHaveAttribute("href", "#magneettijahti-puuttuvat");

    const nuuksioLogo = screen.getByRole("img", { name: "Nuuksio" });
    expect(nuuksioLogo).toHaveAttribute("src", "https://example.com/nuuksio-logo.png");
    const nuuksioLogoWrapper = nuuksioLogo.parentElement;

    if (!(nuuksioLogoWrapper instanceof HTMLElement)) {
      throw new Error("Expected Nuuksio logo wrapper");
    }

    expect(nuuksioLogoWrapper).toHaveClass("h-14", "w-20", "sm:h-20", "sm:w-28");
    expect(nuuksioLogoWrapper).not.toHaveClass("hidden");
    expect(screen.getAllByText("1.")).toHaveLength(2);
    expect(screen.getByText("2.")).toBeInTheDocument();
    expect(screen.getAllByText("visits.parks.item.firstVisit")).toHaveLength(3);
    expect(screen.getByText("visits.parks.item.otherVisits")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "visits.parks.sections.missing" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Kolovesi/ })).toHaveAttribute(
      "href",
      "/paikka/kolovesi",
    );
    expect(screen.getByRole("link", { name: /Oulanka/ })).toHaveAttribute(
      "href",
      "/paikka/oulanka",
    );
    expect(screen.getByRole("link", { name: /Teijo/ })).toHaveAttribute("href", "/paikka/teijo");
    expect(screen.getAllByText("Kansallispuisto")).toHaveLength(2);
    expect(screen.getByText("Retkeilyalue")).toBeInTheDocument();
    const missingParksList = screen
      .getByRole("heading", { name: "visits.parks.sections.missing" })
      .parentElement?.nextElementSibling?.querySelector("ul");

    if (!(missingParksList instanceof HTMLElement)) {
      throw new Error("Expected missing parks list");
    }

    expect(missingParksList).toHaveClass("grid", "md:grid-cols-2");
    const nuuksioLink = screen.getByRole("link", { name: /Nuuksio/ });
    expect(nuuksioLink).toHaveAttribute("href", "/paikka/nuuksio?visit=1#visit-history");
    const nuuksioCard = nuuksioLink.closest("article");

    if (!(nuuksioCard instanceof HTMLElement)) {
      throw new Error("Expected Nuuksio park card");
    }

    expect(
      within(nuuksioCard).getByRole("heading", {
        name: "Nuuksio",
      }),
    ).toHaveClass("text-base", "sm:text-2xl");

    const nuuksioDetailsStack =
      within(nuuksioCard).getByText("15.6.2024").parentElement?.parentElement;

    if (!(nuuksioDetailsStack instanceof HTMLElement)) {
      throw new Error("Expected Nuuksio details stack");
    }

    expect(nuuksioDetailsStack).toHaveClass("w-full", "space-y-5");
    expect(within(nuuksioCard).getByText("15.6.2024")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Seurasaari/ })).toHaveAttribute(
      "href",
      "/paikka/seurasaari?visit=4#visit-history",
    );

    const pallasCard = screen.getByRole("link", { name: /Pallas-Yllastunturi/ }).closest("article");

    if (!(pallasCard instanceof HTMLElement)) {
      throw new Error("Expected Pallas-Yllastunturi park card");
    }

    expect(within(pallasCard).queryByText("visits.parks.item.otherVisits")).not.toBeInTheDocument();
  });

  it("keeps the magnet section navigation ahead of the cards and updates the active chip by scroll position", () => {
    renderTimeline(
      [
        {
          id: 1,
          visitedOn: "2024-06-15",
          route: "Punarinnankierros",
          createdAt: "2024-06-15T10:00:00Z",
          featuredImage: null,
          imageCount: 0,
          trip: null,
          tripStopOrder: null,
          park: {
            name: "Nuuksio",
            slug: "nuuksio",
            typeLabel: "Kansallispuisto",
          },
        },
        {
          id: 2,
          visitedOn: "2024-08-10",
          route: null,
          createdAt: "2024-08-10T10:00:00Z",
          featuredImage: null,
          imageCount: 1,
          trip: null,
          tripStopOrder: null,
          park: {
            name: "Seurasaari",
            slug: "seurasaari",
            typeLabel: "Historiakohde",
          },
        },
      ],
      { selectedYear: null, selectedMonth: null },
      {
        view: "parks",
        magnetSummaryParks,
      },
    );

    const sectionNavigation = screen.getByRole("navigation", {
      name: "visits.parks.sectionNavigationLabel",
    });
    const nationalParksLink = within(sectionNavigation).getByRole("link", {
      name: "visits.parks.sections.nationalParks",
    });
    const otherPlacesLink = within(sectionNavigation).getByRole("link", {
      name: "visits.parks.sections.otherPlaces",
    });
    const missingLink = within(sectionNavigation).getByRole("link", {
      name: "visits.parks.sections.missing",
    });

    expect(
      sectionNavigation.compareDocumentPosition(
        screen.getByRole("heading", { name: "visits.parks.sections.nationalParks" }),
      ),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    setMagnetSectionScrollPositions({
      missingTop: 1200,
      nationalParksTop: -320,
      navBottom: 40,
      otherPlacesTop: 44,
    });

    act(() => {
      fireEvent.scroll(window);
    });

    act(() => {
      setWindowScrollY(420);
      fireEvent.scroll(window);
    });

    expect(otherPlacesLink).toHaveAttribute("aria-current", "location");
    expect(nationalParksLink).not.toHaveAttribute("aria-current");

    setMagnetSectionScrollPositions({
      missingTop: 44,
      nationalParksTop: -920,
      navBottom: 40,
      otherPlacesTop: -280,
    });

    act(() => {
      setWindowScrollY(1360);
      fireEvent.scroll(window);
    });

    expect(missingLink).toHaveAttribute("aria-current", "location");
    expect(otherPlacesLink).not.toHaveAttribute("aria-current");
  });

  it("hides an empty magnet subsection when that group has no visited places", () => {
    renderTimeline(
      [
        {
          id: 1,
          visitedOn: "2024-06-15",
          route: "Punarinnankierros",
          createdAt: "2024-06-15T10:00:00Z",
          featuredImage: null,
          imageCount: 0,
          trip: null,
          tripStopOrder: null,
          park: {
            name: "Nuuksio",
            slug: "nuuksio",
            typeLabel: "Kansallispuisto",
          },
        },
      ],
      { selectedYear: null, selectedMonth: null },
      {
        view: "parks",
        magnetSummaryParks,
      },
    );

    expect(
      screen.getByRole("heading", { name: "visits.parks.sections.nationalParks" }),
    ).toBeInTheDocument();
    const sectionNavigation = screen.getByRole("navigation", {
      name: "visits.parks.sectionNavigationLabel",
    });
    expect(
      screen.queryByRole("heading", { name: "visits.parks.sections.otherPlaces" }),
    ).not.toBeInTheDocument();
    expect(
      within(sectionNavigation).queryByRole("link", { name: "visits.parks.sections.otherPlaces" }),
    ).not.toBeInTheDocument();
    expect(
      within(sectionNavigation).getByRole("link", { name: "visits.parks.sections.nationalParks" }),
    ).toHaveAttribute("href", "#magneettijahti-kansallispuistot");
    expect(
      within(sectionNavigation).getByRole("link", { name: "visits.parks.sections.missing" }),
    ).toHaveAttribute("href", "#magneettijahti-puuttuvat");
    expect(screen.getByText("0 / 2")).toBeInTheDocument();
  });

  it("renders grouped trip cards with summary badges and nested visit links", () => {
    renderTimeline(
      [
        {
          id: 1,
          visitedOn: "2024-06-15",
          route: "Punarinnankierros",
          createdAt: "2024-06-15T10:00:00Z",
          featuredImage: null,
          imageCount: 0,
          trip: {
            id: 7,
            name: "Kesaretki",
            slug: "kesaretki",
          },
          tripStopOrder: 1,
          park: {
            name: "Nuuksio",
            slug: "nuuksio",
            typeLabel: "Kansallispuisto",
          },
        },
        {
          id: 2,
          visitedOn: "2024-06-18",
          route: null,
          createdAt: "2024-06-18T10:00:00Z",
          featuredImage: null,
          imageCount: 2,
          trip: {
            id: 7,
            name: "Kesaretki",
            slug: "kesaretki",
          },
          tripStopOrder: 2,
          park: {
            name: "Pallas-Yllastunturi",
            slug: "pallas-yllastunturi",
            typeLabel: "Kansallispuisto",
          },
        },
      ],
      { selectedYear: null, selectedMonth: null },
    );

    expect(screen.getByText("visits.trip.label")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kesaretki" })).toBeInTheDocument();
    expect(screen.getByText("visits.trip.visitCount")).toBeInTheDocument();
    expect(screen.queryByText("visits.trip.imageCount")).not.toBeInTheDocument();
    expect(screen.getByText("15.-18.6.2024")).toBeInTheDocument();

    const tripCard = screen.getByRole("heading", { name: "Kesaretki" }).closest("article");

    if (!(tripCard instanceof HTMLElement)) {
      throw new Error("Expected trip card");
    }

    const tripVisitLinks = within(tripCard).getAllByRole("link");

    expect(tripVisitLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/retki/kesaretki",
      "/paikka/pallas-yllastunturi?visit=2#visit-history",
      "/paikka/nuuksio?visit=1#visit-history",
    ]);

    expect(within(tripCard).getByRole("link", { name: "visits.trip.viewTrip" })).toHaveAttribute(
      "href",
      "/retki/kesaretki",
    );
  });
});
