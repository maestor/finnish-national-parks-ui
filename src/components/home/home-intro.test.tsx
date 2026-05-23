import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HomeIntro } from "./home-intro";

describe("HomeIntro", () => {
  it("renders the title and both action controls", () => {
    render(
      <HomeIntro
        title="Reissuvihko"
        summary="Lyhyt kuvaus."
        descriptionParagraphs={["Ensimmainen kappale.", "Toinen kappale."]}
        openMapLabel="Siirry kartalle"
        infoClosedLabel="Mista on kyse?"
        infoOpenLabel="Piilota info"
      />,
    );

    expect(screen.getByRole("heading", { name: "Reissuvihko" })).toBeInTheDocument();
    expect(screen.getByText("Lyhyt kuvaus.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Siirry kartalle" })).toHaveAttribute("href", "/parks");
    expect(screen.getByRole("button", { name: "Mista on kyse?" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByText("Ensimmainen kappale.")).toBeInTheDocument();
  });

  it("toggles the intro description open and closed", async () => {
    render(
      <HomeIntro
        title="Reissuvihko"
        summary="Lyhyt kuvaus."
        descriptionParagraphs={["Ensimmainen kappale.", "Toinen kappale."]}
        openMapLabel="Siirry kartalle"
        infoClosedLabel="Mista on kyse?"
        infoOpenLabel="Piilota info"
      />,
    );

    const toggle = screen.getByRole("button", { name: "Mista on kyse?" });

    await userEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Piilota info" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await userEvent.click(screen.getByRole("button", { name: "Piilota info" }));

    expect(screen.getByRole("button", { name: "Mista on kyse?" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
