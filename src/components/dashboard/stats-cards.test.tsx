import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatsCards } from "./stats-cards";

describe("StatsCards", () => {
  it("renders all stat cards with values", () => {
    render(
      <StatsCards
        totalVisits={12}
        uniqueParks={5}
        parksWithNotes={3}
        mostVisitedPark={{ name: "Pallas", visitCount: 4 }}
      />,
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Pallas (4)")).toBeInTheDocument();
  });

  it("shows dash when no most visited park", () => {
    render(
      <StatsCards totalVisits={0} uniqueParks={0} parksWithNotes={0} mostVisitedPark={null} />,
    );

    expect(screen.getByText("–")).toBeInTheDocument();
  });
});
