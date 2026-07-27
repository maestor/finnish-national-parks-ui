import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LatestTrips } from "./latest-trips";

describe("LatestTrips", () => {
  it("renders the newest trips with public trip links", () => {
    render(
      <LatestTrips
        title="Viimeisimmät retket"
        emptyMessage="Ei retkiä"
        backToStartLabel="Takaisin alkuun"
        trips={[
          {
            tripName: "Keski-Suomen kesaretki",
            tripSlug: "keski-suomen-kesaretki",
            startDate: "2024-07-20",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Viimeisimmät retket" })).toBeInTheDocument();
    expect(screen.getByText("20.7.2024")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Keski-Suomen kesaretki" })).toHaveAttribute(
      "href",
      "/retki/keski-suomen-kesaretki",
    );
    expect(screen.getByRole("link", { name: "Takaisin alkuun" })).toHaveAttribute(
      "href",
      "#home-top",
    );
  });

  it("shows an empty state when there are no trips", () => {
    render(
      <LatestTrips
        title="Viimeisimmät retket"
        emptyMessage="Ei retkiä"
        backToStartLabel="Takaisin alkuun"
        trips={[]}
      />,
    );

    expect(screen.getByText("Ei retkiä")).toBeInTheDocument();
  });

  it("shows a placeholder when the trip start date is missing", () => {
    render(
      <LatestTrips
        title="Viimeisimmät retket"
        emptyMessage="Ei retkiä"
        backToStartLabel="Takaisin alkuun"
        trips={[
          {
            tripName: "Lapin ruska",
            tripSlug: "lapin-ruska",
            startDate: null,
          },
        ]}
      />,
    );

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
