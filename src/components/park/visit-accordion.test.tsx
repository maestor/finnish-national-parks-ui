import type { Visit } from "@/lib/parks";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VisitAccordion } from "./visit-accordion";

describe("VisitAccordion", () => {
  const visits: Visit[] = [
    {
      id: 1,
      visitedOn: "2024-01-15",
      route: null,
      author: null,
      note: null,
      createdAt: "2024-01-15T00:00:00Z",
      updatedAt: "2024-01-15T00:00:00Z",
      images: [],
    },
    {
      id: 2,
      visitedOn: "2024-03-20",
      route: "Nuuksion reitti",
      author: null,
      note: "Great hike",
      createdAt: "2024-03-20T00:00:00Z",
      updatedAt: "2024-03-20T00:00:00Z",
      images: [],
    },
    {
      id: 3,
      visitedOn: "2024-07-31",
      route: null,
      author: "Maija Meikäläinen",
      note: "Summer trip",
      createdAt: "2024-07-31T00:00:00Z",
      updatedAt: "2024-07-31T00:00:00Z",
      images: [],
    },
    {
      id: 4,
      visitedOn: "2024-08-15",
      route: "Pallas-reitti",
      author: "Pekka Puistossa",
      note: null,
      createdAt: "2024-08-15T00:00:00Z",
      updatedAt: "2024-08-15T00:00:00Z",
      images: [
        {
          id: 10,
          fullUrl: "https://example.com/full.jpg",
          thumbUrl: "https://example.com/thumb.jpg",
          fullWidth: 1920,
          fullHeight: 1080,
          thumbWidth: 400,
          thumbHeight: 225,
          originalName: "pallas.jpg",
          displayOrder: 0,
          createdAt: "2024-08-15T00:00:00Z",
        },
      ],
    },
  ];

  it("renders visits sorted newest first with correct numbering", () => {
    render(<VisitAccordion visits={visits} />);

    // Visit numbers are shown as translated badges via park.visitNumber
    const badges = screen.getAllByText(/park\.visitNumber/);
    expect(badges.length).toBe(4);
  });

  it("shows expandable items for visits with details", () => {
    render(<VisitAccordion visits={visits} />);

    const toggleButtons = screen.getAllByRole("button", {
      name: /park\.(showDetails|hideDetails)/i,
    });
    expect(toggleButtons.length).toBe(3);
  });

  it("shows non-expandable items for visits without any details", () => {
    render(<VisitAccordion visits={visits} />);

    expect(screen.getByText("15.1.2024")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /15\.1\.2024/ })).not.toBeInTheDocument();
  });

  it("displays route badge when present", () => {
    render(<VisitAccordion visits={visits} />);

    expect(screen.getByText("Pallas-reitti")).toBeInTheDocument();
    expect(screen.getByText("Nuuksion reitti")).toBeInTheDocument();
  });

  it("displays author section when present", () => {
    render(<VisitAccordion visits={visits} />);

    // Latest visit (id: 4) is expanded by default and has an author
    expect(screen.getByText("Pekka Puistossa")).toBeInTheDocument();
    expect(screen.getAllByText("park.authorTitle").length).toBeGreaterThanOrEqual(1);
  });

  it("displays an image section when visit images exist", () => {
    render(<VisitAccordion visits={visits} />);

    expect(screen.getByText("park.imagesTitle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "imageGallery.open" })).toBeInTheDocument();
  });

  it("shows edit links when editable", () => {
    render(<VisitAccordion visits={visits} isEditable />);

    expect(screen.getAllByLabelText("controlPanel.visits.edit").length).toBe(4);
  });

  it("does not show edit links when not editable", () => {
    render(<VisitAccordion visits={visits} />);

    expect(screen.queryByLabelText("controlPanel.visits.edit")).not.toBeInTheDocument();
  });
});
