import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import type { Visit } from "@/lib/parks";
import { ParkVisitHistory } from "./park-visit-history";

const mockUseAuth = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("./visit-accordion", () => ({
  VisitAccordion: ({
    visits,
    isEditable,
  }: {
    visits: { id: number; status?: string }[];
    isEditable?: boolean;
  }) => (
    <div data-testid="visit-accordion">
      visits:{visits.length}|editable:{String(isEditable)}|drafts:
      {visits.filter((visit) => visit.status === "draft").length}
    </div>
  ),
}));

const visits: Visit[] = [
  {
    id: 10,
    visitedOn: "2024-06-15",
    route: "Huippupolku",
    excludeFromRoute: false,
    author: "Maija",
    location: null,
    note: "Aurinkoinen reissu",
    trip: null,
    tripStopOrder: null,
    createdAt: "2024-06-15T10:00:00Z",
    updatedAt: "2024-06-15T10:00:00Z",
    images: [],
  },
];

describe("ParkVisitHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue({ visits } as never);
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
    expect(apiFetch).not.toHaveBeenCalled();
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

  it("loads draft visits for authenticated admins on the park page", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    vi.mocked(apiFetch).mockResolvedValue({
      visits: [{ ...visits[0], status: "draft" }],
    } as never);

    render(
      <ParkVisitHistory
        title="Käyntihistoria"
        addVisitLabel="Lisää käynti"
        noVisitsLabel="Ei käyntejä"
        parkSlug="pallas"
        visits={visits}
      />,
    );

    expect(await screen.findByTestId("visit-accordion")).toHaveTextContent("drafts:1");
    expect(apiFetch).toHaveBeenCalledWith("/api/admin/parks/pallas/visits", {
      cache: "no-store",
    });
  });

  it("keeps public visits visible when the admin-only park request fails", async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("Admin session expired"));

    render(
      <ParkVisitHistory
        title="Käyntihistoria"
        addVisitLabel="Lisää käynti"
        noVisitsLabel="Ei käyntejä"
        parkSlug="pallas"
        visits={visits}
      />,
    );

    expect(await screen.findByTestId("visit-accordion")).toHaveTextContent("visits:1");
  });

  it("shows the empty state when the park has no published visits", () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false });

    render(
      <ParkVisitHistory
        title="Käyntihistoria"
        addVisitLabel="Lisää käynti"
        noVisitsLabel="Ei käyntejä"
        parkSlug="pallas"
        visits={[]}
      />,
    );

    expect(screen.getByText("Ei käyntejä")).toBeInTheDocument();
    expect(screen.queryByTestId("visit-accordion")).not.toBeInTheDocument();
  });
});
