import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EditIconLink } from "./edit-icon-link";

describe("EditIconLink", () => {
  it("shows the edit label on hover and keyboard focus while preserving its destination", async () => {
    const user = userEvent.setup();
    render(<EditIconLink href="/hallinta/paikat/pallas/muokkaa" label="Muokkaa paikan tietoja" />);
    const link = screen.getByRole("link", { name: "Muokkaa paikan tietoja" });
    expect(link).toHaveAttribute("href", "/hallinta/paikat/pallas/muokkaa");
    expect(link).not.toHaveAttribute("title");

    await user.hover(link);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Muokkaa paikan tietoja");
    expect(link).toHaveAttribute("aria-describedby", screen.getByRole("tooltip").id);

    await user.unhover(link);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(link).not.toHaveAttribute("aria-describedby");

    await user.tab();
    expect(link).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Muokkaa paikan tietoja");
    await user.tab();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("preserves caller styling and keyboard activation callbacks", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault());
    render(
      <EditIconLink
        href="/hallinta/retket/1/muokkaa"
        label="Muokkaa retkeä"
        className="rounded-full p-2"
        iconClassName="h-4 w-4"
        onClick={onClick}
      />,
    );
    const link = screen.getByRole("link", { name: "Muokkaa retkeä" });
    expect(link).toHaveClass("rounded-full", "p-2");
    expect(link.querySelector("svg")).toHaveClass("h-4", "w-4");
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledOnce();
  });
});
