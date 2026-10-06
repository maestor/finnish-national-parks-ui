import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeSpecialVisit } from "./home-special-visit";

const visit = {
  id: 12,
  park: { name: "Vernissa", slug: "vernissa" },
  visitedOn: "2026-09-12",
  route: "Rantapolku, 4 km",
  imageCount: 1,
  descriptionExcerpt: "Syksyinen käynti",
  featuredImage: { url: "https://images.example.com/visit.jpg", width: 1200, height: 800 },
};

const park = {
  name: "Nuuksio",
  slug: "nuuksio",
  visitCount: 9,
  areaKm2: 55,
  establishmentYear: 1994,
  type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" as const },
  descriptionExcerpt: "Tuttu metsä",
  featuredImage: null,
};

describe("HomeSpecialVisit", () => {
  it("shows visit then park with archive links and park facts", () => {
    render(<HomeSpecialVisit visit={visit} park={park} />);
    const cards = screen.getAllByRole("article");
    expect(cards.map((card) => card.textContent)).toEqual([
      expect.stringContaining("Vernissa"),
      expect.stringContaining("Nuuksio"),
    ]);
    expect(
      screen.getByRole("heading", { name: "home.specialVisit.visitSubtitle", level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "home.specialVisit.parkSubtitle", level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "home.featured.allVisits" })).toHaveAttribute(
      "href",
      "/kaynnit",
    );
    expect(screen.getByRole("link", { name: "home.specialVisit.allParks" })).toHaveAttribute(
      "href",
      "/paikat",
    );
    expect(screen.getByRole("link", { name: "Nuuksio" })).toHaveAttribute(
      "href",
      "/paikka/nuuksio",
    );
    expect(screen.getByText("Kansallispuisto")).toBeVisible();
    expect(screen.getByText("1994")).toBeVisible();
    expect(screen.getByText("55 km²")).toBeVisible();
    expect(screen.getByText("home.specialVisit.parkRibbon")).toBeVisible();
    expect(screen.getByText("Tuttu metsä")).toBeVisible();
  });
  it("shows a full-width park alone and omits missing facts", () => {
    render(
      <HomeSpecialVisit
        visit={null}
        park={{ ...park, areaKm2: null, establishmentYear: null, descriptionExcerpt: null }}
      />,
    );
    expect(screen.getByRole("link", { name: "Nuuksio" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "home.featured.allVisits" })).not.toBeInTheDocument();
    expect(screen.getByText("home.specialVisit.parkDescriptionPlaceholder")).toBeVisible();
    expect(screen.queryByText("1994")).not.toBeInTheDocument();
  });
  it("omits the entire section when no public visit is selected", () => {
    const { container } = render(<HomeSpecialVisit visit={null} park={null} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("shows the selected visit with a section heading, description and canonical detail link", () => {
    const { container } = render(<HomeSpecialVisit visit={visit} park={null} />);
    expect(screen.getByRole("region", { name: "home.specialVisit.title" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "home.specialVisit.title", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText("home.specialVisit.description")).toBeInTheDocument();
    expect(screen.getByText("Rantapolku, 4 km")).toBeVisible();
    expect(screen.getByRole("link", { name: "home.backToStart" })).toHaveAttribute(
      "href",
      "#home-top",
    );
    expect(screen.getByText("home.specialVisit.ribbon")).toBeVisible();
    expect(screen.getByRole("link", { name: "Vernissa" })).toHaveAccessibleDescription(
      /home.specialVisit.ribbon/,
    );
    expect(screen.getByRole("heading", { name: "Vernissa", level: 4 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vernissa" })).toHaveAttribute(
      "href",
      "/paikka/vernissa?visit=12#visit-history",
    );
    expect(screen.getByRole("link", { name: "Vernissa" })).toHaveAttribute(
      "title",
      "home.featured.readVisit",
    );
    expect(screen.getByText("12.9.2026").closest(".aspect-video")).not.toBeNull();
    expect(screen.getByText("12.9.2026").closest('[aria-hidden="true"]')).toBeNull();
    expect(screen.getAllByText("12.9.2026")).toHaveLength(1);
    expect(container.querySelector("img")).toHaveAttribute("loading", "lazy");
    expect(container.querySelector("img")).toHaveAttribute(
      "sizes",
      "(max-width: 1023px) calc(100vw - 2rem), 960px",
    );
  });
});
