import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeActivityPanels } from "./home-activity-panels";

vi.mock("@/components/dashboard/recent-visits", () => ({
  RecentVisits: ({ visits }: { visits: { parkName: string }[] }) => (
    <div data-testid="recent-visits">visits:{visits.length}|edit:false</div>
  ),
}));

vi.mock("@/components/dashboard/latest-visit-entries", () => ({
  LatestVisitEntries: ({ visits }: { visits: { parkName: string }[] }) => (
    <div data-testid="latest-visit-entries">visits:{visits.length}|edit:false</div>
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
  it("renders the public summary fallbacks without edit actions", () => {
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
  });
});
