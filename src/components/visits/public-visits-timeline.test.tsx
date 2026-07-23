import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPublicVisitsTimelineModel,
  type FrontendTimelineVisit,
  type PublicVisitsMapMarker,
  type PublicVisitsView,
} from "@/lib/public-visits";
import { PublicVisitsTimeline } from "./public-visits-timeline";

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
  extras?: { view?: PublicVisitsView; mapMarkers?: PublicVisitsMapMarker[] },
) => {
  const model = buildPublicVisitsTimelineModel(visits, selection);

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
    />,
  );
};

const { mockPush } = vi.hoisted(() => ({
  mockPush: vi.fn(),
}));

const mockScrollTo = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("PublicVisitsTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T09:00:00Z"));
    mockPush.mockReset();
    mockScrollTo.mockReset();

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
  });

  const visits: FrontendTimelineVisit[] = [
    {
      id: 1,
      visitedOn: "2024-06-15",
      route: "Punarinnankierros",
      createdAt: "2024-06-15T10:00:00Z",
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

    const monthTimeline = screen.getAllByRole("list")[0]?.closest("ol");
    const nuuksioVisitItem = screen.getByRole("heading", { name: "Nuuksio" }).closest("li");
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
    expect(screen.getAllByText("visits.item.viewVisit")).toHaveLength(3);
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

  it("keeps the view-visit label on the same top row as the date", () => {
    renderTimeline(visits, { selectedYear: null, selectedMonth: null });

    const nuuksioHeading = screen.getByRole("heading", { name: "Nuuksio" });
    const topRow = nuuksioHeading.previousElementSibling;

    if (!(topRow instanceof HTMLElement)) {
      throw new Error("Expected visit top row");
    }

    expect(topRow).toHaveClass("flex", "items-start", "justify-between", "gap-3");
    expect(within(topRow).getByText("15.6.2024")).toBeInTheDocument();
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
    expect(timelineWrapper).toHaveClass("md:before:bottom-[3.25rem]");

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

  it("renders grouped trip cards with summary badges and nested visit links", () => {
    renderTimeline(
      [
        {
          id: 1,
          visitedOn: "2024-06-15",
          route: "Punarinnankierros",
          createdAt: "2024-06-15T10:00:00Z",
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
    expect(screen.getByText("visits.trip.imageCount")).toBeInTheDocument();
    expect(screen.getByText("15.-18.6.2024")).toBeInTheDocument();

    const tripCard = screen.getByRole("heading", { name: "Kesaretki" }).closest("article");

    if (!(tripCard instanceof HTMLElement)) {
      throw new Error("Expected trip card");
    }

    const tripVisitLinks = within(tripCard).getAllByRole("link");

    expect(tripVisitLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/paikka/pallas-yllastunturi?visit=2#visit-history",
      "/paikka/nuuksio?visit=1#visit-history",
    ]);
  });
});
