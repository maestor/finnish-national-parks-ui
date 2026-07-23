import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeActivityPanels } from "./home-activity-panels";

vi.mock("@/components/dashboard/recent-visits", () => ({
  RecentVisits: ({
    visits,
    backToStartLabel,
  }: {
    visits: { parkName: string }[];
    backToStartLabel: string;
  }) => (
    <div data-testid="recent-visits">
      visits:{visits.length}|edit:false|back:{backToStartLabel}
    </div>
  ),
}));

vi.mock("@/components/dashboard/latest-visit-entries", () => ({
  LatestVisitEntries: ({
    visits,
    backToStartLabel,
  }: {
    visits: { parkName: string }[];
    backToStartLabel: string;
  }) => (
    <div data-testid="latest-visit-entries">
      visits:{visits.length}|edit:false|back:{backToStartLabel}
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
  it("renders the home summary fallbacks without edit actions", () => {
    const { container } = render(
      <HomeActivityPanels
        recentVisitsTitle="Recent"
        recentVisitsEmptyMessage="None"
        latestEntriesTitle="Latest"
        latestEntriesEmptyMessage="None"
        backToStartLabel="Takaisin alkuun"
        fallbackRecentVisits={fallbackRecentVisits}
        fallbackLatestVisitEntries={fallbackLatestVisitEntries}
      />,
    );

    expect(screen.getByTestId("recent-visits")).toHaveTextContent(
      "visits:1|edit:false|back:Takaisin alkuun",
    );
    expect(screen.getByTestId("latest-visit-entries")).toHaveTextContent(
      "visits:1|edit:false|back:Takaisin alkuun",
    );
    expect(container.firstElementChild).toHaveClass("grid", "gap-6", "lg:grid-cols-2");
    expect(container.firstElementChild).not.toHaveClass("xl:grid-cols-2");
  });
});
