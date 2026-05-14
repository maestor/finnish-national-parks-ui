import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecentVisits } from "./recent-visits";

describe("RecentVisits", () => {
  it("renders recent visits with park names, dates and edit links", () => {
    render(
      <RecentVisits
        visits={[
          { id: 1, parkName: "Pallas", parkSlug: "pallas", visitedOn: "2024-06-15" },
          { id: 2, parkName: "Nuuksio", parkSlug: "nuuksio", visitedOn: "2024-07-20" },
        ]}
      />,
    );

    expect(screen.getByText("Pallas")).toBeInTheDocument();
    expect(screen.getByText("2024-06-15")).toBeInTheDocument();
    expect(screen.getByText("Nuuksio")).toBeInTheDocument();
    expect(screen.getByText("2024-07-20")).toBeInTheDocument();
    expect(screen.getAllByLabelText("controlPanel.visits.edit").length).toBe(2);
  });

  it("shows empty state when no visits", () => {
    render(<RecentVisits visits={[]} />);

    expect(screen.getByText("controlPanel.dashboard.recentVisits.noVisits")).toBeInTheDocument();
  });
});
