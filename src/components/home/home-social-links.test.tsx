import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HomeSocialLinks } from "./home-social-links";

describe("HomeSocialLinks", () => {
  const renderSocialLinks = () =>
    render(
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

  it("renders centered social links with accessible names and copyright text", () => {
    const { container } = renderSocialLinks();

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

  it("opens the four groups of data sources from the copyright area and closes them again", async () => {
    const user = userEvent.setup();
    renderSocialLinks();
    const region = within(screen.getByRole("region", { name: "Sosiaaliset linkit" }));
    const copyright = region.getByText("Copyright © Kalle Haavisto 2026->");
    const disclosure = region.getByText("home.social.dataSources.title");
    const details = disclosure.closest("details");

    expect(
      copyright.compareDocumentPosition(disclosure) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(details).not.toHaveAttribute("open");

    await user.click(disclosure);

    expect(details).toHaveAttribute("open");
    for (const group of ["maps", "places", "routes", "weather"]) {
      expect(
        region.getByRole("heading", { name: `home.social.dataSources.${group}` }),
      ).toBeVisible();
    }
    for (const link of region.getAllByRole("link", { name: "home.social.dataSources.lipas" })) {
      expect(link).toHaveAttribute("href", expect.stringContaining("jyu.fi"));
    }
    expect(
      region.getAllByRole("link", { name: "home.social.dataSources.ccBy" })[0],
    ).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/deed.fi");
    const geoapify = region.getByRole("link", { name: "home.social.dataSources.geoapify" });
    expect(geoapify).toHaveAttribute("href", "https://www.geoapify.com/terms-and-conditions/");
    expect(geoapify.closest("li")).toHaveTextContent(
      "home.social.dataSources.geoapify · home.social.dataSources.geoapifyUsage",
    );
    for (const link of region
      .getAllByRole("list")
      .flatMap((list) => within(list).getAllByRole("link"))) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(region.queryByText(/home\.social\.dataSources\.unconfirmed/)).toBeNull();

    await user.click(disclosure);
    expect(details).not.toHaveAttribute("open");
  });
});
