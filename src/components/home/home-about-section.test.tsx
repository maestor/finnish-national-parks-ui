import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeAboutSection } from "./home-about-section";

describe("HomeAboutSection", () => {
  it("renders the about content and places the back-to-start link before extra links", () => {
    const { container } = render(
      <HomeAboutSection
        title="Mista on kyse"
        descriptionParagraphs={["Ensimmainen kappale.", "Toinen kappale."]}
        backToStartLabel="Takaisin alkuun"
      >
        <div data-testid="about-links">Linkit</div>
      </HomeAboutSection>,
    );

    expect(screen.getByRole("heading", { name: "Mista on kyse" })).toBeInTheDocument();
    expect(screen.getByText("Ensimmainen kappale.")).toBeInTheDocument();
    expect(screen.getByText("Toinen kappale.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Takaisin alkuun" })).toHaveAttribute(
      "href",
      "#home-top",
    );
    expect(container.querySelector("section")).toHaveAttribute("id", "home-about");
    expect(
      screen
        .getByRole("link", { name: "Takaisin alkuun" })
        .compareDocumentPosition(screen.getByTestId("about-links")),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("omits the extra links wrapper when no children are provided", () => {
    render(
      <HomeAboutSection
        title="Mista on kyse"
        descriptionParagraphs={["Ensimmainen kappale."]}
        backToStartLabel="Takaisin alkuun"
      />,
    );

    expect(screen.queryByTestId("about-links")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Takaisin alkuun" })).toBeInTheDocument();
  });
});
