import { apiFetch } from "@/lib/api";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeActivityPanels } from "./home-activity-panels";

const mockUseAuth = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/components/dashboard/recent-visits", () => ({
  RecentVisits: ({
    visits,
    showEditLinks,
  }: {
    visits: { parkName: string }[];
    showEditLinks?: boolean;
  }) => (
    <div data-testid="recent-visits">
      visits:{visits.length}|edit:{String(showEditLinks)}
    </div>
  ),
}));

vi.mock("@/components/dashboard/latest-visit-entries", () => ({
  LatestVisitEntries: ({
    visits,
    showEditLinks,
  }: {
    visits: { parkName: string }[];
    showEditLinks?: boolean;
  }) => (
    <div data-testid="latest-visit-entries">
      visits:{visits.length}|edit:{String(showEditLinks)}
    </div>
  ),
}));

const fallbackRecentVisits = [
  {
    parkName: "Pallas-Yllästunturi",
    parkSlug: "pallas",
    visitedOn: "2024-06-15",
  },
];

const fallbackLatestVisitEntries = [
  {
    id: 10,
    parkName: "Pallas-Yllästunturi",
    parkSlug: "pallas",
    createdAt: "2024-06-15T10:00:00Z",
  },
];

describe("HomeActivityPanels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the public summary fallbacks for unauthenticated visitors", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <HomeActivityPanels
        recentVisitsTitle="Recent"
        recentVisitsEmptyMessage="None"
        latestEntriesTitle="Latest"
        latestEntriesEmptyMessage="None"
        fallbackRecentVisits={fallbackRecentVisits}
        fallbackLatestVisitEntries={fallbackLatestVisitEntries}
      />,
    );

    expect(screen.getByTestId("recent-visits")).toHaveTextContent("visits:1|edit:false");
    expect(screen.getByTestId("latest-visit-entries")).toHaveTextContent("visits:1|edit:false");
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("loads admin visit data for authenticated users so quick edit links stay available", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });

    vi.mocked(apiFetch).mockResolvedValueOnce({
      visits: [
        {
          id: 10,
          visitedOn: "2024-06-15",
          route: null,
          author: null,
          note: null,
          createdAt: "2024-06-15T10:00:00Z",
          updatedAt: "2024-06-15T10:00:00Z",
          images: [],
          park: {
            name: "Pallas-Yllästunturi",
            slug: "pallas",
          },
        },
      ],
    });

    render(
      <HomeActivityPanels
        recentVisitsTitle="Recent"
        recentVisitsEmptyMessage="None"
        latestEntriesTitle="Latest"
        latestEntriesEmptyMessage="None"
        fallbackRecentVisits={fallbackRecentVisits}
        fallbackLatestVisitEntries={fallbackLatestVisitEntries}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("recent-visits")).toHaveTextContent("visits:1|edit:true");
    });
    expect(screen.getByTestId("latest-visit-entries")).toHaveTextContent("visits:1|edit:true");
    expect(apiFetch).toHaveBeenCalledWith("/api/visits");
  });
});
