import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeSummaryPanels } from "./home-summary-panels";

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

vi.mock("@/components/dashboard/most-visited-parks", () => ({
  MostVisitedParks: ({
    parks,
    backToStartLabel,
  }: {
    parks: { parkName: string }[];
    backToStartLabel: string;
  }) => (
    <div data-testid="most-visited-parks">
      parks:{parks.length}|back:{backToStartLabel}
    </div>
  ),
}));

vi.mock("@/components/dashboard/latest-trips", () => ({
  LatestTrips: ({
    trips,
    backToStartLabel,
  }: {
    trips: { tripName: string }[];
    backToStartLabel: string;
  }) => (
    <div data-testid="latest-trips">
      trips:{trips.length}|back:{backToStartLabel}
    </div>
  ),
}));

describe("HomeSummaryPanels", () => {
  it("renders the four home summary cards in a two-column grid without edit actions", () => {
    const { container } = render(
      <HomeSummaryPanels
        recentVisitsTitle="Recent"
        recentVisitsEmptyMessage="None"
        latestEntriesTitle="Latest"
        latestEntriesEmptyMessage="None"
        mostVisitedParksTitle="Most visited"
        mostVisitedParksEmptyMessage="None"
        mostVisitedParksVisitCountLabel="visits"
        latestTripsTitle="Latest trips"
        latestTripsEmptyMessage="None"
        backToStartLabel="Takaisin alkuun"
        fallbackRecentVisits={[
          {
            parkName: "Pallas-Yllästunturi",
            parkSlug: "pallas",
            visitedOn: "2024-06-15",
          },
        ]}
        fallbackLatestVisitEntries={[
          {
            id: 10,
            parkName: "Pallas-Yllästunturi",
            parkSlug: "pallas",
            createdAt: "2024-06-15T10:00:00Z",
          },
        ]}
        fallbackMostVisitedParks={[
          {
            parkName: "Pallas-Yllästunturi",
            parkSlug: "pallas",
            visitCount: 3,
          },
        ]}
        fallbackLatestTrips={[
          {
            tripName: "Keski-Suomen kesaretki",
            tripSlug: "keski-suomen-kesaretki",
            startDate: "2024-07-20",
          },
        ]}
      />,
    );

    expect(screen.getByTestId("recent-visits")).toHaveTextContent(
      "visits:1|edit:false|back:Takaisin alkuun",
    );
    expect(screen.getByTestId("latest-visit-entries")).toHaveTextContent(
      "visits:1|edit:false|back:Takaisin alkuun",
    );
    expect(screen.getByTestId("most-visited-parks")).toHaveTextContent(
      "parks:1|back:Takaisin alkuun",
    );
    expect(screen.getByTestId("latest-trips")).toHaveTextContent("trips:1|back:Takaisin alkuun");
    expect(container.firstElementChild).toHaveClass("grid", "gap-6", "lg:grid-cols-2");
    expect(
      screen
        .getByTestId("recent-visits")
        .compareDocumentPosition(screen.getByTestId("latest-trips")),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      screen
        .getByTestId("latest-trips")
        .compareDocumentPosition(screen.getByTestId("latest-visit-entries")),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      screen
        .getByTestId("latest-visit-entries")
        .compareDocumentPosition(screen.getByTestId("most-visited-parks")),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
