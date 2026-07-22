import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Visit } from "@/lib/parks";
import { ParkVisitHistory } from "./park-visit-history";

const mockUseAuth = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("./visit-accordion", () => ({
  VisitAccordion: ({ visits, isEditable }: { visits: { id: number }[]; isEditable?: boolean }) => (
    <div data-testid="visit-accordion">
      visits:{visits.length}|editable:{String(isEditable)}
    </div>
  ),
}));

const visits: Visit[] = [
  {
    id: 10,
    visitedOn: "2024-06-15",
    route: "Huippupolku",
    author: "Maija",
    note: "Aurinkoinen reissu",
    trip: null,
    createdAt: "2024-06-15T10:00:00Z",
    updatedAt: "2024-06-15T10:00:00Z",
    images: [],
  },
];

describe("ParkVisitHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides admin controls for logged out visitors", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <ParkVisitHistory
        title="Käyntihistoria"
        addVisitLabel="Lisää käynti"
        noVisitsLabel="Ei käyntejä"
        parkSlug="pallas"
        visits={visits}
      />,
    );

    expect(screen.queryByRole("link", { name: "Lisää käynti" })).not.toBeInTheDocument();
    expect(screen.getByTestId("visit-accordion")).toHaveTextContent("visits:1|editable:false");
  });

  it("shows admin controls for authenticated users", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <ParkVisitHistory
        title="Käyntihistoria"
        addVisitLabel="Lisää käynti"
        noVisitsLabel="Ei käyntejä"
        parkSlug="pallas"
        visits={visits}
      />,
    );

    expect(screen.getByRole("link", { name: "Lisää käynti" })).toHaveAttribute(
      "href",
      "/hallinta/kaynnit/uusi?park=pallas",
    );
    expect(screen.getByTestId("visit-accordion")).toHaveTextContent("visits:1|editable:true");
  });
});
