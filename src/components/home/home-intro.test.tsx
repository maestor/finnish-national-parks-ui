import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeIntro } from "./home-intro";

describe("HomeIntro", () => {
  it("renders the title and both action links", () => {
    const { container } = render(
      <HomeIntro
        title="Reissuvihko"
        summary="Lyhyt kuvaus."
        openMapLabel="Siirry kartalle"
        infoLabel="Mista on kyse?"
      />,
    );

    expect(screen.getByRole("heading", { name: "Reissuvihko" })).toBeInTheDocument();
    expect(screen.getByText("Lyhyt kuvaus.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Siirry kartalle" })).toHaveAttribute(
      "href",
      "/paikat",
    );
    expect(screen.getByRole("link", { name: "Mista on kyse?" })).toHaveAttribute(
      "href",
      "#home-about",
    );
    expect(screen.getByRole("link", { name: "Mista on kyse?" })).toHaveClass("cursor-pointer");
    expect(container.querySelector("section")).toHaveAttribute(
      "aria-labelledby",
      "home-intro-title",
    );
  });
});
