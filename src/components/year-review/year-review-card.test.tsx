import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { YearReviewStats } from "@/lib/year-review";
import { YearReviewCard } from "./year-review-card";

const labels = {
  eyebrow: "Vuosikatsaus",
  emptyYear: "Ei käyntejä tänä vuonna.",
  stats: {
    visits: "Käyntiä",
    parks: "Paikkaa",
    newParks: "Uutta paikkaa",
    revisitedParks: "Uudelleenkäytyä",
    images: "Kuvaa",
    activeMonths: "Aktiivista kuukautta",
    mostVisited: "Eniten käyty",
  },
  seasonsTitle: "Käynnit vuodenajoittain",
  seasons: { spring: "Kevät", summer: "Kesä", autumn: "Syksy", winter: "Talvi" },
};

const createStats = (overrides: Partial<YearReviewStats> = {}): YearReviewStats => ({
  year: 2024,
  visitCount: 7,
  distinctParkCount: 4,
  newParkCount: 2,
  revisitedParkCount: 2,
  mostVisitedPark: { name: "Nuuksio", slug: "nuuksio", visitCount: 3 },
  activeMonthCount: 5,
  imageCount: 12,
  seasonalVisits: { spring: 2, summer: 3, autumn: 1, winter: 1 },
  ...overrides,
});

describe("YearReviewCard", () => {
  it("shows the year, headline stats, most-visited park, and seasonal split", () => {
    render(<YearReviewCard stats={createStats()} labels={labels} />);

    expect(screen.getByRole("heading", { name: "2024" })).toBeInTheDocument();
    expect(screen.getByText("Vuosikatsaus")).toBeInTheDocument();

    const statPairs: Array<[string, number]> = [
      ["Käyntiä", 7],
      ["Paikkaa", 4],
      ["Uutta paikkaa", 2],
      ["Uudelleenkäytyä", 2],
      ["Kuvaa", 12],
      ["Aktiivista kuukautta", 5],
      ["Kevät", 2],
      ["Kesä", 3],
      ["Syksy", 1],
      ["Talvi", 1],
    ];

    for (const [label, value] of statPairs) {
      expect(screen.getByText(label).nextElementSibling).toHaveTextContent(String(value));
    }

    expect(screen.getByText("Eniten käyty")).toBeInTheDocument();
    expect(screen.getByText(/Nuuksio/)).toHaveTextContent("Nuuksio (3)");
    expect(screen.getByText("Käynnit vuodenajoittain")).toBeInTheDocument();
  });

  it("shows an empty-year message instead of stats when the year has no visits", () => {
    render(
      <YearReviewCard
        stats={createStats({
          visitCount: 0,
          distinctParkCount: 0,
          newParkCount: 0,
          revisitedParkCount: 0,
          mostVisitedPark: null,
          activeMonthCount: 0,
          imageCount: 0,
          seasonalVisits: { spring: 0, summer: 0, autumn: 0, winter: 0 },
        })}
        labels={labels}
      />,
    );

    expect(screen.getByText("Ei käyntejä tänä vuonna.")).toBeInTheDocument();
    expect(screen.queryByText("Eniten käyty")).not.toBeInTheDocument();
  });
});
