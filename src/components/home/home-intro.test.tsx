import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HomeIntro } from "./home-intro";

describe("HomeIntro", () => {
  it("renders the title and both action controls", () => {
    const { container } = render(
      <HomeIntro
        title="Reissuvihko"
        summary="Lyhyt kuvaus."
        descriptionParagraphs={["Ensimmainen kappale.", "Toinen kappale."]}
        openMapLabel="Siirry kartalle"
        infoClosedLabel="Mista on kyse?"
        infoOpenLabel="Piilota info"
      >
        <div>Lisatiedot</div>
      </HomeIntro>,
    );

    expect(screen.getByRole("heading", { name: "Reissuvihko" })).toBeInTheDocument();
    expect(screen.getByText("Lyhyt kuvaus.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Siirry kartalle" })).toHaveAttribute(
      "href",
      "/paikat",
    );
    expect(screen.getByRole("button", { name: "Mista on kyse?" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: "Mista on kyse?" })).toHaveClass("cursor-pointer");
    expect(screen.getByText("Ensimmainen kappale.")).toBeInTheDocument();
    expect(screen.getByText("Lisatiedot")).toBeInTheDocument();
    expect(container.querySelector("section")).toHaveAttribute(
      "aria-labelledby",
      "home-intro-title",
    );
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
      >
        <div>Lisatiedot</div>
      </HomeIntro>,
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
