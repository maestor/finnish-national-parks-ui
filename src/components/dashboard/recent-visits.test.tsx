import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecentVisits } from "./recent-visits";

describe("RecentVisits", () => {
  it("renders recent visits with park names, dates and edit links", () => {
    render(
      <RecentVisits
        title="Viimeisimmät käynnit"
        emptyMessage="Ei käyntejä"
        backToStartLabel="Takaisin alkuun"
        visits={[
          { id: 1, parkName: "Pallas", parkSlug: "pallas", visitedOn: "2024-06-15T22:30:00Z" },
          { id: 2, parkName: "Nuuksio", parkSlug: "nuuksio", visitedOn: "2024-07-20" },
        ]}
        showEditLinks
      />,
    );

    expect(screen.getByRole("heading", { name: "Viimeisimmät käynnit" })).toBeInTheDocument();
    expect(screen.getByText("Pallas")).toBeInTheDocument();
    expect(screen.getByText("16.6.2024")).toBeInTheDocument();
    expect(screen.getByText("Nuuksio")).toBeInTheDocument();
    expect(screen.getByText("20.7.2024")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pallas" })).toHaveAttribute(
      "href",
      "/paikka/pallas?visit=1#visit-history",
    );
    expect(screen.getByRole("link", { name: "Nuuksio" })).toHaveAttribute(
      "href",
      "/paikka/nuuksio?visit=2#visit-history",
    );
    expect(screen.getAllByLabelText("controlPanel.visits.edit").length).toBe(2);
    expect(screen.getByRole("link", { name: "Takaisin alkuun" })).toHaveAttribute(
      "href",
      "#home-top",
    );
  });

  it("hides edit links when visit management is not available", () => {
    render(
      <RecentVisits
        title="Viimeisimmät käynnit"
        emptyMessage="Ei käyntejä"
        backToStartLabel="Takaisin alkuun"
        visits={[{ id: 1, parkName: "Pallas", parkSlug: "pallas", visitedOn: "2024-06-15" }]}
      />,
    );

    expect(screen.queryByLabelText("controlPanel.visits.edit")).not.toBeInTheDocument();
  });

  it("renders home summary visits without ids", () => {
    render(
      <RecentVisits
        title="Viimeisimmät käynnit"
        emptyMessage="Ei käyntejä"
        backToStartLabel="Takaisin alkuun"
        visits={[
          { parkName: "Pallas", parkSlug: "pallas", visitedOn: "2024-06-15" },
          { parkName: "Nuuksio", parkSlug: "nuuksio", visitedOn: "2024-07-20" },
        ]}
      />,
    );

    expect(screen.getByText("Pallas")).toBeInTheDocument();
    expect(screen.getByText("Nuuksio")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pallas" })).toHaveAttribute("href", "/paikka/pallas");
    expect(screen.getByRole("link", { name: "Nuuksio" })).toHaveAttribute(
      "href",
      "/paikka/nuuksio",
    );
  });

  it("shows empty state when no visits", () => {
    render(
      <RecentVisits
        title="Viimeisimmät käynnit"
        emptyMessage="Ei käyntejä"
        backToStartLabel="Takaisin alkuun"
        visits={[]}
      />,
    );

    expect(screen.getByText("Ei käyntejä")).toBeInTheDocument();
  });
});
