import type { PersonalPark } from "@/lib/parks";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VisitList } from "./visit-list";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const parks = [
  {
    slug: "pallas",
    name: "Pallas-Yllästunturi",
    visits: [
      {
        id: 1,
        visitedOn: "2024-06-15",
        route: "Pallas-reitti",
        note: "Great hike",
        createdAt: "2024-06-15T00:00:00Z",
        updatedAt: "2024-06-15T00:00:00Z",
      },
    ],
  },
  {
    slug: "nuuksio",
    name: "Nuuksio",
    visits: [
      {
        id: 2,
        visitedOn: "2024-07-20",
        route: null,
        note: null,
        createdAt: "2024-07-20T00:00:00Z",
        updatedAt: "2024-07-20T00:00:00Z",
      },
    ],
  },
] as PersonalPark[];

describe("VisitList", () => {
  it("renders visits sorted by date descending", () => {
    render(<VisitList parks={parks} />);

    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(3); // header + 2 visits

    expect(screen.getByText("Nuuksio")).toBeInTheDocument();
    expect(screen.getByText("2024-07-20")).toBeInTheDocument();
    expect(screen.getByText("Pallas-Yllästunturi")).toBeInTheDocument();
    expect(screen.getByText("2024-06-15")).toBeInTheDocument();
    expect(screen.getByText("Pallas-reitti")).toBeInTheDocument();
    expect(screen.getAllByText("–").length).toBe(1);
  });

  it("shows empty state when no visits exist", () => {
    render(<VisitList parks={[]} />);

    expect(screen.getByText("controlPanel.visits.list.noVisits")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "controlPanel.visits.list.addFirstVisit" }),
    ).toBeInTheDocument();
  });

  it("renders edit icon links", () => {
    render(<VisitList parks={parks} />);

    expect(screen.getAllByLabelText("controlPanel.visits.edit").length).toBe(2);
  });
});
