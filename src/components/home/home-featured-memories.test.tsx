import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { HomeSummary } from "@/lib/frontend-summaries";
import { HomeFeaturedMemories } from "./home-featured-memories";

const trip: NonNullable<HomeSummary["latestTrip"]> = {
  id: 1,
  name: "Kesäretki",
  slug: "kesaretki",
  dateRange: null,
  visitCount: 2,
  stopCount: 0,
  descriptionExcerpt: null,
  featuredImage: null,
};
const visit: NonNullable<HomeSummary["latestStandaloneVisit"]> = {
  id: 12,
  park: { name: "Vernissa", slug: "vernissa" },
  visitedOn: "2026-09-12",
  route: "Rantapolku, 4 km",
  imageCount: 1,
  descriptionExcerpt: "Syksyinen käynti",
  featuredImage: {
    url: "https://images.example.com/visit.jpg",
    width: 1200,
    height: 800,
  },
};

describe("HomeFeaturedMemories", () => {
  it("loads both featured covers immediately for the opening viewport", () => {
    const { container } = render(
      <HomeFeaturedMemories
        latestTrip={{ ...trip, featuredImage: visit.featuredImage }}
        latestStandaloneVisit={visit}
      />,
    );

    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image).toHaveAttribute("loading", "eager");
    }
  });

  it("provides independent archive links and exact memory destinations with the home heading hierarchy", () => {
    render(<HomeFeaturedMemories latestTrip={trip} latestStandaloneVisit={visit} />);
    expect(
      screen.getByRole("heading", { name: "home.featured.latestTrip", level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: trip.name, level: 4 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: trip.name })).toHaveAttribute(
      "href",
      "/retki/kesaretki",
    );
    expect(screen.getByRole("link", { name: "Vernissa" })).toHaveAttribute(
      "href",
      "/paikka/vernissa?visit=12#visit-history",
    );
    expect(screen.getByRole("link", { name: "home.featured.allTrips" })).toHaveAttribute(
      "href",
      "/retket",
    );
    expect(screen.getByRole("link", { name: "home.featured.allVisits" })).toHaveAttribute(
      "href",
      "/kaynnit",
    );
    expect(screen.getByText("tripsArchive.descriptionPlaceholder")).toBeInTheDocument();
    expect(screen.getByText("Rantapolku, 4 km")).toBeVisible();
    expect(screen.getByText("tripsArchive.missingDate")).toBeInTheDocument();
    expect(document.querySelector("a a")).toBeNull();
  });
  it.each(["trip", "visit", "both"])(
    "keeps independent title rows when %s content is missing",
    (missing) => {
      render(
        <HomeFeaturedMemories
          latestTrip={missing === "visit" ? trip : null}
          latestStandaloneVisit={missing === "trip" ? visit : null}
        />,
      );
      expect(screen.getByRole("link", { name: "home.featured.allTrips" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "home.featured.allVisits" })).toBeInTheDocument();
      if (missing !== "visit")
        expect(screen.getByText("home.featured.emptyTrip")).toBeInTheDocument();
      if (missing !== "trip")
        expect(screen.getByText("home.featured.emptyVisit")).toBeInTheDocument();
    },
  );
  it("shows the visit note and image fallbacks without losing the card", () => {
    const { container } = render(
      <HomeFeaturedMemories
        latestTrip={null}
        latestStandaloneVisit={{ ...visit, descriptionExcerpt: null, route: null }}
      />,
    );
    expect(screen.getByText("home.featured.notePlaceholder")).toHaveClass("italic");
    expect(screen.queryByText("Rantapolku, 4 km")).not.toBeInTheDocument();
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("link", { name: "Vernissa" })).toBeInTheDocument();
    expect(container.querySelector(".aspect-video")).toBeInTheDocument();
  });
});
