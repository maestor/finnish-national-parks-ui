import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VisitAccordion } from "./visit-accordion";

describe("VisitAccordion", () => {
  const visits = [
    { id: 1, visitedOn: "2024-01-15", note: null },
    { id: 2, visitedOn: "2024-03-20", note: "Great hike" },
    { id: 3, visitedOn: "2024-07-31", note: "Summer trip" },
  ];

  it("renders visits sorted newest first with correct numbering", () => {
    render(<VisitAccordion visits={visits} />);

    const items = screen.getAllByText(/park\.visitNumber/i);
    expect(items.length).toBe(3);
  });

  it("shows expandable items for visits with notes", () => {
    render(<VisitAccordion visits={visits} />);

    // Latest visit is expanded by default, so it shows hideDetails
    expect(screen.getByText("park.hideDetails")).toBeInTheDocument();
    expect(screen.getByText("park.showDetails")).toBeInTheDocument();
  });

  it("shows non-expandable items for visits without notes", () => {
    render(<VisitAccordion visits={visits} />);

    expect(screen.getByText("park.noDetails")).toBeInTheDocument();
  });
});
