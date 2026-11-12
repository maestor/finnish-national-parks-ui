import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import type { Visit } from "@/lib/parks";
import {
  LinkedParkSectionNavigation,
  LinkedParkVisitHistory,
  ParkVisitVisibilityProvider,
} from "./park-visit-link";

const mockUseAuth = vi.fn();
const { query } = vi.hoisted(() => ({ query: { value: "" } }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query.value) }));
vi.mock("@/components/navigation/sticky-section-navigation", () => ({
  StickySectionNavigation: ({
    items,
  }: {
    items: { id: string; label: string; initialTargetId?: string }[];
  }) => (
    <nav aria-label="Osat">
      {items.map((item) => (
        <a key={item.id} href={`#${item.initialTargetId ?? item.id}`}>
          {item.label}
        </a>
      ))}
    </nav>
  ),
}));
vi.mock("./visit-accordion", () => ({
  VisitAccordion: ({ visits }: { visits: Visit[] }) => <div>{visits.length} käyntiä</div>,
}));

const visit: Visit = {
  id: 10,
  visitedOn: "2024-06-15",
  route: null,
  excludeFromRoute: false,
  author: "Maija",
  location: null,
  note: null,
  trip: null,
  tripStopOrder: null,
  createdAt: "2024-06-15T10:00:00Z",
  updatedAt: "2024-06-15T10:00:00Z",
  images: [],
};
const renderPage = (visits: Visit[]) =>
  render(
    <ParkVisitVisibilityProvider initialVisitIds={visits.map((item) => item.id)}>
      <LinkedParkSectionNavigation
        ariaLabel="Osat"
        items={[
          { id: "park-location", label: "Sijainti" },
          { id: "visit-history", label: "Vierailut" },
        ]}
      />
      <LinkedParkVisitHistory
        visits={visits}
        parkSlug="pallas"
        title="Käyntihistoria"
        addVisitLabel="Lisää käynti"
      />
    </ParkVisitVisibilityProvider>,
  );

describe("park visit visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.value = "";
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false });
  });
  it("shows draft-only history and its navigation after the admin visit request succeeds", async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    vi.mocked(apiFetch).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    query.value = "visit=10";
    renderPage([]);
    expect(screen.queryByRole("navigation", { name: "Osat" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Käyntihistoria" })).not.toBeInTheDocument();
    await act(async () => {
      resolveRequest({ visits: [{ ...visit, status: "draft" }] });
    });
    expect(screen.getByRole("heading", { name: "Käyntihistoria" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vierailut" })).toHaveAttribute(
      "href",
      "#park-visit-10",
    );
    expect(screen.getByText("1 käyntiä")).toBeInTheDocument();
  });
  it("removes history and its navigation when the refreshed visible visits become empty", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ visits: [] });
    renderPage([visit]);
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Käyntihistoria" })).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("navigation", { name: "Osat" })).not.toBeInTheDocument();
  });
});
