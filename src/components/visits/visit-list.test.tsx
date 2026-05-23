import type { VisitWithPark } from "@/lib/parks";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    images: [
      {
        id: 11,
        fullUrl: "https://example.com/full-11.jpg",
        thumbUrl: "https://example.com/thumb-11.jpg",
        fullWidth: 1200,
        fullHeight: 900,
        thumbWidth: 400,
        thumbHeight: 300,
        originalName: "pallas.jpg",
        displayOrder: 0,
        createdAt: "2024-06-15T00:00:00Z",
      },
    ],
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

    expect(screen.getByRole("link", { name: "Nuuksio" })).toBeInTheDocument();
    expect(screen.getByText("2024-07-20")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pallas-Yllästunturi" })).toBeInTheDocument();
    expect(screen.getByText("2024-06-15")).toBeInTheDocument();
    expect(screen.getByText("Pallas-reitti")).toBeInTheDocument();
    expect(screen.getAllByText("–").length).toBe(1);
    expect(
      screen.getByRole("columnheader", { name: "controlPanel.visits.list.noteStatus" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "controlPanel.visits.list.imageStatus" }),
    ).toBeInTheDocument();
  });

  it("shows note and image status badges for each visit", () => {
    render(<VisitList visits={visits} />);

    const pallasRow = screen.getByRole("link", { name: "Pallas-Yllästunturi" }).closest("tr");
    const nuuksioRow = screen.getByRole("link", { name: "Nuuksio" }).closest("tr");

    expect(pallasRow).not.toBeNull();
    expect(nuuksioRow).not.toBeNull();

    expect(
      within(pallasRow as HTMLElement).getAllByText("controlPanel.visits.list.complete"),
    ).toHaveLength(2);
    expect(
      within(nuuksioRow as HTMLElement).getAllByText("controlPanel.visits.list.missing"),
    ).toHaveLength(2);
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

  it("filters visits by search query and selected park", async () => {
    const user = userEvent.setup();

    render(<VisitList visits={visits} />);

    await user.type(
      screen.getByLabelText("controlPanel.visits.list.filters.searchLabel"),
      "Pallas",
    );

    expect(screen.getByRole("link", { name: "Pallas-Yllästunturi" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Nuuksio" })).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("controlPanel.visits.list.filters.searchLabel"));
    await user.selectOptions(
      screen.getByLabelText("controlPanel.visits.list.filters.parkLabel"),
      "nuuksio",
    );

    expect(screen.getByRole("link", { name: "Nuuksio" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Pallas-Yllästunturi" })).not.toBeInTheDocument();
  });

  it("shows filtered empty state when no rows match", async () => {
    const user = userEvent.setup();

    render(<VisitList visits={visits} />);

    await user.type(
      screen.getByLabelText("controlPanel.visits.list.filters.searchLabel"),
      "Lemmenjoki",
    );

    expect(screen.getByText("controlPanel.visits.list.emptyFiltered")).toBeInTheDocument();
  });

  it("resets the filters after narrowing the visit list", async () => {
    const user = userEvent.setup();

    render(<VisitList visits={visits} />);

    await user.type(
      screen.getByLabelText("controlPanel.visits.list.filters.searchLabel"),
      "Pallas",
    );
    await user.selectOptions(
      screen.getByLabelText("controlPanel.visits.list.filters.parkLabel"),
      "pallas",
    );

    expect(screen.queryByRole("link", { name: "Nuuksio" })).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "controlPanel.visits.list.filters.reset" }),
    );

    expect(screen.getByRole("link", { name: "Nuuksio" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pallas-Yllästunturi" })).toBeInTheDocument();
  });
});
