import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MostVisitedParks } from "./most-visited-parks";

describe("MostVisitedParks", () => {
  it("renders the park leaderboard", () => {
    render(
      <MostVisitedParks
        title="Eniten käydyt puistot"
        emptyMessage="Ei käyntejä"
        visitCountLabel="käyntiä"
        parks={[
          { parkName: "Pallas", parkSlug: "pallas", visitCount: 4 },
          { parkName: "Nuuksio", parkSlug: "nuuksio", visitCount: 2 },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Eniten käydyt puistot" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pallas" })).toHaveAttribute("href", "/park/pallas");
    expect(screen.getByText("4 käyntiä")).toBeInTheDocument();
  });

  it("shows an empty state when there is no visit data", () => {
    render(
      <MostVisitedParks
        title="Eniten käydyt puistot"
        emptyMessage="Ei käyntejä"
        visitCountLabel="käyntiä"
        parks={[]}
      />,
    );

    expect(screen.getByText("Ei käyntejä")).toBeInTheDocument();
  });
});
