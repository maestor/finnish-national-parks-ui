import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeSocialLinks } from "./home-social-links";

describe("HomeSocialLinks", () => {
  it("renders centered social links with accessible names and copyright text", () => {
    const { container } = render(
      <HomeSocialLinks
        sectionLabel="Sosiaaliset linkit"
        title="Toteutus"
        linkedInLabel="LinkedIn-profiili"
        linkedInText="LinkedIn"
        githubUiLabel="UI-projekti GitHubissa"
        githubUiText="UI"
        githubApiLabel="API-projekti GitHubissa"
        githubApiText="API"
        copyrightLabel="Copyright © Kalle Haavisto 2026->"
      />,
    );

    expect(screen.getByRole("region", { name: "Sosiaaliset linkit" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Sosiaaliset linkit" })).toHaveClass("text-left");
    expect(screen.getByText("Toteutus")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByText("UI")).toBeInTheDocument();
    expect(screen.getByText("API")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "LinkedIn-profiili" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/khaavisto/",
    );
    expect(screen.getByRole("link", { name: "LinkedIn-profiili" })).toHaveAttribute(
      "title",
      "LinkedIn-profiili",
    );
    expect(container.querySelector('img[src*="/social/linkedin-inbug-black.png"]')).toBeTruthy();
    expect(container.querySelector('img[src*="/social/linkedin-inbug-white.png"]')).toBeTruthy();
    expect(screen.getByRole("link", { name: "UI-projekti GitHubissa" })).toHaveAttribute(
      "href",
      "https://github.com/maestor/finnish-national-parks-ui/",
    );
    expect(screen.getByRole("link", { name: "UI-projekti GitHubissa" })).toHaveAttribute(
      "title",
      "UI-projekti GitHubissa",
    );
    expect(
      container.querySelector('img[src*="/social/github-invertocat-black.svg"]'),
    ).toHaveAttribute("src", expect.stringContaining("/social/github-invertocat-black.svg"));
    expect(container.querySelector('img[src*="/social/github-invertocat-white.svg"]')).toBeTruthy();
    expect(screen.getByRole("link", { name: "API-projekti GitHubissa" })).toHaveAttribute(
      "href",
      "https://github.com/maestor/finnish-national-parks-api",
    );
    expect(screen.getByRole("link", { name: "API-projekti GitHubissa" })).toHaveAttribute(
      "title",
      "API-projekti GitHubissa",
    );
    expect(screen.getByText("Copyright © Kalle Haavisto 2026->")).toBeInTheDocument();
  });
});
