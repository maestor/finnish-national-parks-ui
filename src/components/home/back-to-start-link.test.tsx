import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BackToStartLink } from "./back-to-start-link";

describe("BackToStartLink", () => {
  it("renders a compact link back to the top of the home page", () => {
    render(<BackToStartLink label="Takaisin alkuun" />);

    expect(screen.getByRole("link", { name: "Takaisin alkuun" })).toHaveAttribute(
      "href",
      "#home-top",
    );
    expect(screen.getByRole("link", { name: "Takaisin alkuun" })).toHaveClass("text-xs");
  });
});
