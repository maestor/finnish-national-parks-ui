import type { VisitWithPark } from "@/lib/parks";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicVisitsTimeline } from "./public-visits-timeline";

describe("PublicVisitsTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T09:00:00Z"));
  });

  const visits: VisitWithPark[] = [
    {
      id: 1,
      visitedOn: "2024-06-15",
      route: "Punarinnankierros",
      author: "Maija",
      note: "Kesainen paiva.",
      createdAt: "2024-06-15T10:00:00Z",
      updatedAt: "2024-06-15T10:00:00Z",
      images: [],
      park: {
        name: "Nuuksio",
        slug: "nuuksio",
      },
    },
    {
      id: 2,
      visitedOn: "2024-08-10",
      route: null,
      author: "Kalle",
      note: null,
      createdAt: "2024-08-10T10:00:00Z",
      updatedAt: "2024-08-10T10:00:00Z",
      images: [
        {
          id: 20,
          fullUrl: "https://example.com/full.jpg",
          thumbUrl: "https://example.com/thumb.jpg",
          fullWidth: 1200,
          fullHeight: 800,
          thumbWidth: 400,
          thumbHeight: 267,
          originalName: "retki.jpg",
          displayOrder: 0,
          createdAt: "2024-08-10T10:00:00Z",
        },
      ],
      park: {
        name: "Pallas-Yllastunturi",
        slug: "pallas-yllastunturi",
      },
    },
    {
      id: 3,
      visitedOn: "2025-02-05",
      route: "Talvipolku",
      author: null,
      note: "Lumista ja kirkasta.",
      createdAt: "2025-02-05T10:00:00Z",
      updatedAt: "2025-02-05T10:00:00Z",
      images: [],
      park: {
        name: "Oulanka",
        slug: "oulanka",
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
    expect(screen.getByRole("link", { name: "2024" })).toHaveAttribute("href", "/visits?year=2024");
    expect(screen.getByRole("link", { name: "2025" })).toHaveAttribute("href", "/visits?year=2025");
    expect(screen.getByRole("link", { name: "2026" })).toHaveAttribute("href", "/visits?year=2026");
  });

  it("shows all twelve month filters when a year is selected", () => {
    render(<PublicVisitsTimeline visits={visits} selectedYear={2024} selectedMonth={null} />);

    const monthNav = screen.getByRole("navigation", { name: "visits.filters.monthsLabel" });
    const monthLinks = within(monthNav).getAllByRole("link");

    expect(monthLinks).toHaveLength(13);
    expect(
      within(monthNav).getByRole("link", { name: "visits.filters.allMonthsLabel" }),
    ).toHaveAttribute("href", "/visits?year=2024");
  });

  it("filters timeline items by selected year and month and links to the targeted visit", () => {
    render(<PublicVisitsTimeline visits={visits} selectedYear={2024} selectedMonth={8} />);

    expect(screen.getByRole("heading", { name: "2024" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /elo/i })).toBeInTheDocument();
    expect(screen.queryByText("Nuuksio")).not.toBeInTheDocument();
    expect(screen.queryByText("Kesainen paiva.")).not.toBeInTheDocument();

    const visitLink = screen.getByRole("link", {
      name: "visits.item.openVisit",
    });
    expect(visitLink).toHaveAttribute("href", "/park/pallas-yllastunturi?visit=2#visit-history");
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
    const visitLinks = screen.getAllByRole("link", { name: "visits.item.openVisit" });

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

  it("shows a continuous month spine and simplified note and image badges", () => {
    render(<PublicVisitsTimeline visits={visits} selectedYear={null} selectedMonth={null} />);

    const monthTimeline = screen.getAllByRole("list")[0]?.closest("ol");
    const noteBadge = screen.getAllByLabelText("visits.item.note")[0];
    const imageBadge = screen.getByLabelText("visits.item.imageCount");

    if (!(monthTimeline instanceof HTMLElement) || !(noteBadge instanceof HTMLElement)) {
      throw new Error("Expected timeline list and note badge");
    }

    expect(monthTimeline).toHaveClass("before:absolute");
    expect(noteBadge).toHaveTextContent("");
    expect(imageBadge).toHaveTextContent("1");
    expect(screen.queryByText("visits.item.note")).not.toBeInTheDocument();
    expect(screen.getAllByText("visits.item.viewVisit")).toHaveLength(3);
  });

  it("shows an empty state when a selected year has no visits yet", () => {
    render(<PublicVisitsTimeline visits={visits} selectedYear={2026} selectedMonth={null} />);

    expect(screen.getByText("visits.empty.filtered")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "visits.filters.reset" })).toHaveAttribute(
      "href",
      "/visits",
    );
  });
});
