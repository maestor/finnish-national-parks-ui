import type { FrontendTimelineVisit } from "@/lib/public-visits";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicVisitsTimeline } from "./public-visits-timeline";

describe("PublicVisitsTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T09:00:00Z"));
  });

  const visits: FrontendTimelineVisit[] = [
    {
      id: 1,
      visitedOn: "2024-06-15",
      route: "Punarinnankierros",
      createdAt: "2024-06-15T10:00:00Z",
      imageCount: 0,
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
      park: {
        name: "Oulanka",
        slug: "oulanka",
        typeLabel: "Kansallispuisto",
      },
    },
  ];

  it("shows years from the first visit year through the current year", () => {
    render(<PublicVisitsTimeline visits={visits} selectedYear={null} selectedMonth={null} />);

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

  it("shows all twelve month filters when a year is selected", () => {
    render(<PublicVisitsTimeline visits={visits} selectedYear={2024} selectedMonth={null} />);

    const monthNav = screen.getByRole("navigation", { name: "visits.filters.monthsLabel" });
    const monthLinks = within(monthNav).getAllByRole("link");

    expect(monthLinks).toHaveLength(13);
    expect(monthLinks[1]).toHaveTextContent(/tammi/i);
    expect(
      within(monthNav).getByRole("link", { name: "visits.filters.allMonthsLabel" }),
    ).toHaveAttribute("href", "/kaynnit?year=2024");
  });

  it("filters timeline items by selected year and month and links to the targeted visit", () => {
    render(<PublicVisitsTimeline visits={visits} selectedYear={2024} selectedMonth={8} />);

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
    render(<PublicVisitsTimeline visits={visits} selectedYear={2024} selectedMonth={null} />);

    expect(screen.getByText("(2 visits.filters.visibleCount)")).toBeInTheDocument();
    expect(screen.queryByText("visits.summary.total")).not.toBeInTheDocument();
    expect(screen.queryByText("visits.summary.showing")).not.toBeInTheDocument();
  });

  it("alternates month cards on opposite sides of the centered timeline on desktop", () => {
    render(<PublicVisitsTimeline visits={visits} selectedYear={null} selectedMonth={null} />);

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
    render(<PublicVisitsTimeline visits={visits} selectedYear={2024} selectedMonth={null} />);

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
    render(<PublicVisitsTimeline visits={visits} selectedYear={2024} selectedMonth={null} />);

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

  it("shows a continuous month spine with the park type as the first detail badge", () => {
    render(<PublicVisitsTimeline visits={visits} selectedYear={null} selectedMonth={null} />);

    const monthTimeline = screen.getAllByRole("list")[0]?.closest("ol");
    const parkTypeBadge = screen.getAllByText("Kansallispuisto")[0];
    const imageBadge = screen.getByLabelText("visits.item.imageCount");
    const routeBadge = screen.getByText("Punarinnankierros");

    if (
      !(monthTimeline instanceof HTMLElement) ||
      !(parkTypeBadge instanceof HTMLElement) ||
      !(routeBadge instanceof HTMLElement)
    ) {
      throw new Error("Expected timeline list and detail badges");
    }

    expect(monthTimeline).toHaveClass("before:absolute");
    expect(parkTypeBadge.compareDocumentPosition(routeBadge)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(imageBadge).toHaveTextContent("1");
    expect(screen.queryByLabelText("visits.item.note")).not.toBeInTheDocument();
    expect(screen.getAllByText("visits.item.viewVisit")).toHaveLength(3);
  });

  it("shows the park type badge in the shared detail badge row when metadata is available", () => {
    render(<PublicVisitsTimeline visits={visits} selectedYear={null} selectedMonth={null} />);

    const badgeRow = screen.getByText("Punarinnankierros").parentElement;

    if (!(badgeRow instanceof HTMLElement)) {
      throw new Error("Expected visit badge row");
    }

    expect(badgeRow).toHaveClass("mt-3", "flex", "flex-wrap", "gap-2");
    expect(within(badgeRow).getByText("Kansallispuisto")).toBeInTheDocument();
  });

  it("keeps the view-visit label on the same top row as the date", () => {
    render(<PublicVisitsTimeline visits={visits} selectedYear={null} selectedMonth={null} />);

    const nuuksioHeading = screen.getByRole("heading", { name: "Nuuksio" });
    const topRow = nuuksioHeading.previousElementSibling;

    if (!(topRow instanceof HTMLElement)) {
      throw new Error("Expected visit top row");
    }

    expect(topRow).toHaveClass("flex", "items-start", "justify-between", "gap-3");
    expect(within(topRow).getByText("15.6.2024")).toBeInTheDocument();
  });

  it("uses centered mobile month headers and aligns the mobile spine with visit markers", () => {
    render(<PublicVisitsTimeline visits={visits} selectedYear={null} selectedMonth={null} />);

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

  it("shows an empty state when a selected year has no visits yet", () => {
    render(<PublicVisitsTimeline visits={visits} selectedYear={2026} selectedMonth={null} />);

    expect(screen.getByText("visits.empty.filtered")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "visits.filters.reset" })).toHaveAttribute(
      "href",
      "/kaynnit",
    );
  });
});
