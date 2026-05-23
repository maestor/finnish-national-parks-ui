import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeVisitStats } from "./home-visit-stats";

describe("HomeVisitStats", () => {
  it("renders the total visits card and progress bars", () => {
    render(
      <HomeVisitStats
        sectionTitle="Käynnit"
        totalVisitsLabel="Käyntejä yhteensä"
        totalVisits={12}
        progressItems={[
          { label: "Kaikki puistot", visited: 5, total: 10 },
          { label: "Kansallispuistot", visited: 3, total: 8 },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Käynnit" })).toBeInTheDocument();
    expect(screen.getByText("Käyntejä yhteensä")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Kaikki puistot")).toBeInTheDocument();
    expect(screen.getByText("5 / 10")).toBeInTheDocument();
    expect(screen.queryByText("Käynnit tyypeittäin")).not.toBeInTheDocument();
  });

  it("renders nothing when there are no progress items", () => {
    const { container } = render(
      <HomeVisitStats
        sectionTitle="Käynnit"
        totalVisitsLabel="Käyntejä yhteensä"
        totalVisits={0}
        progressItems={[]}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
