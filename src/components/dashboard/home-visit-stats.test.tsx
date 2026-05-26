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
          { label: "Kansallispuistot", visited: 3, total: 8, mapFilter: "national-park" },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Käynnit" })).toBeInTheDocument();
    expect(screen.getByText("Käyntejä yhteensä")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Kaikki puistot")).toBeInTheDocument();
    expect(screen.getByText("5 / 10")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Kansallispuistot/i })).toHaveAttribute(
      "href",
      "/parks?filter=national-park",
    );
    expect(screen.queryByText("Käynnit tyypeittäin")).not.toBeInTheDocument();
  });

  it("renders the seasonal visits card when seasonal data is provided", () => {
    render(
      <HomeVisitStats
        sectionTitle="Käynnit"
        totalVisitsLabel="Käyntejä yhteensä"
        totalVisits={85}
        progressItems={[{ label: "Kaikki puistot", visited: 5, total: 10 }]}
        seasonalVisitsLabel="Käynnit kausittain"
        seasonalVisits={{ spring: 27, summer: 37, autumn: 16, winter: 5 }}
        springLabel="Kevät"
        summerLabel="Kesä"
        autumnLabel="Syksy"
        winterLabel="Talvi"
      />,
    );

    expect(screen.getByText("Käynnit kausittain")).toBeInTheDocument();
    expect(screen.getByText("27")).toBeInTheDocument();
    expect(screen.getByText("37")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByLabelText("Kevät")).toBeInTheDocument();
    expect(screen.getByLabelText("Kesä")).toBeInTheDocument();
    expect(screen.getByLabelText("Syksy")).toBeInTheDocument();
    expect(screen.getByLabelText("Talvi")).toBeInTheDocument();
  });

  it("does not render seasonal visits card when seasonal data is missing", () => {
    render(
      <HomeVisitStats
        sectionTitle="Käynnit"
        totalVisitsLabel="Käyntejä yhteensä"
        totalVisits={12}
        progressItems={[{ label: "Kaikki puistot", visited: 5, total: 10 }]}
      />,
    );

    expect(screen.queryByText("Käynnit kausittain")).not.toBeInTheDocument();
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
