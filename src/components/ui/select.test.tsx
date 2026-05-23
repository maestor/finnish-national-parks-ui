import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Select } from "./select";

describe("Select", () => {
  it("renders a padded select with a decorative chevron", () => {
    render(
      <Select aria-label="Puisto">
        <option value="">Kaikki puistot</option>
      </Select>,
    );

    const select = screen.getByRole("combobox", { name: "Puisto" });

    expect(select).toHaveClass("appearance-none");
    expect(select).toHaveClass("pr-10");
    expect(document.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
