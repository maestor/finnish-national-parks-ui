import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecentVisits } from "./recent-visits";

describe("RecentVisits", () => {
  it("renders recent visits with park names, dates and edit links", () => {
    render(
      <RecentVisits
        title="Viimeisimmät käynnit"
        emptyMessage="Ei käyntejä"
        visits={[
          { id: 1, parkName: "Pallas", parkSlug: "pallas", visitedOn: "2024-06-15" },
          { id: 2, parkName: "Nuuksio", parkSlug: "nuuksio", visitedOn: "2024-07-20" },
        ]}
        showEditLinks
      />,
    );

    expect(screen.getByRole("heading", { name: "Viimeisimmät käynnit" })).toBeInTheDocument();
    expect(screen.getByText("Pallas")).toBeInTheDocument();
    expect(screen.getByText("15.6.2024")).toBeInTheDocument();
    expect(screen.getByText("Nuuksio")).toBeInTheDocument();
    expect(screen.getByText("20.7.2024")).toBeInTheDocument();
    expect(screen.getAllByLabelText("controlPanel.visits.edit").length).toBe(2);
  });

  it("hides edit links when visit management is not available", () => {
    render(
      <RecentVisits
        title="Viimeisimmät käynnit"
        emptyMessage="Ei käyntejä"
        visits={[{ id: 1, parkName: "Pallas", parkSlug: "pallas", visitedOn: "2024-06-15" }]}
      />,
    );

    expect(screen.queryByLabelText("controlPanel.visits.edit")).not.toBeInTheDocument();
  });

  it("renders public summary visits without ids", () => {
    render(
      <RecentVisits
        title="Viimeisimmät käynnit"
        emptyMessage="Ei käyntejä"
        visits={[
          { parkName: "Pallas", parkSlug: "pallas", visitedOn: "2024-06-15" },
          { parkName: "Nuuksio", parkSlug: "nuuksio", visitedOn: "2024-07-20" },
        ]}
      />,
    );

    expect(screen.getByText("Pallas")).toBeInTheDocument();
    expect(screen.getByText("Nuuksio")).toBeInTheDocument();
  });

  it("shows empty state when no visits", () => {
    render(<RecentVisits title="Viimeisimmät käynnit" emptyMessage="Ei käyntejä" visits={[]} />);

    expect(screen.getByText("Ei käyntejä")).toBeInTheDocument();
  });
});
