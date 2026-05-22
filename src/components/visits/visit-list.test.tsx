import type { VisitWithPark } from "@/lib/parks";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VisitList } from "./visit-list";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const visits = [
  {
    id: 1,
    visitedOn: "2024-06-15",
    route: "Pallas-reitti",
    author: null,
    note: "Great hike",
    createdAt: "2024-06-15T00:00:00Z",
    updatedAt: "2024-06-15T00:00:00Z",
    images: [],
    park: {
      slug: "pallas",
      name: "Pallas-Yllästunturi",
    },
  },
  {
    id: 2,
    visitedOn: "2024-07-20",
    route: null,
    author: null,
    note: null,
    createdAt: "2024-07-20T00:00:00Z",
    updatedAt: "2024-07-20T00:00:00Z",
    images: [],
    park: {
      slug: "nuuksio",
      name: "Nuuksio",
    },
  },
] as VisitWithPark[];

describe("VisitList", () => {
  it("renders visits sorted by date descending", () => {
    render(<VisitList visits={visits} />);

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
    render(<VisitList visits={[]} />);

    expect(screen.getByText("controlPanel.visits.list.noVisits")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "controlPanel.visits.list.addFirstVisit" }),
    ).toBeInTheDocument();
  });

  it("renders edit icon links", () => {
    render(<VisitList visits={visits} />);

    expect(screen.getAllByLabelText("controlPanel.visits.edit").length).toBe(2);
  });
});
