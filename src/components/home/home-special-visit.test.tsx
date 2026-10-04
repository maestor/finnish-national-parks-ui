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

describe("HomeSpecialVisit", () => {
  it("omits the entire section when no public visit is selected", () => {
    const { container } = render(<HomeSpecialVisit visit={null} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("shows the selected visit with a section heading, description and canonical detail link", () => {
    const { container } = render(<HomeSpecialVisit visit={visit} />);
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
    expect(screen.getByRole("heading", { name: "Vernissa", level: 3 })).toBeInTheDocument();
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
