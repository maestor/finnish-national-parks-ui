import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ControlPanelNav } from "./control-panel-nav";

const { pathnameState } = vi.hoisted(() => ({
  pathnameState: { value: "/control-panel" },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
}));

describe("ControlPanelNav", () => {
  beforeEach(() => {
    pathnameState.value = "/control-panel";
  });

  it("renders navigation links", () => {
    render(<ControlPanelNav />);

    const nav = screen.getByRole("navigation");

    expect(within(nav).getByRole("link", { name: "controlPanel.dashboard.title" })).toHaveAttribute(
      "href",
      "/hallinta",
    );
    expect(within(nav).getByRole("link", { name: "controlPanel.parks.title" })).toHaveAttribute(
      "href",
      "/hallinta/paikat",
    );
    expect(within(nav).getByRole("link", { name: "controlPanel.trips.title" })).toHaveAttribute(
      "href",
      "/hallinta/retket",
    );
    expect(within(nav).getByRole("link", { name: "controlPanel.visits.title" })).toHaveAttribute(
      "href",
      "/hallinta/kaynnit",
    );
  });

  it("marks the current page link with aria-current", () => {
    pathnameState.value = "/control-panel/parks";

    render(<ControlPanelNav />);

    expect(screen.getByRole("link", { name: "controlPanel.parks.title" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("does not mark non-current links with aria-current", () => {
    pathnameState.value = "/control-panel";

    render(<ControlPanelNav />);

    expect(screen.getByRole("link", { name: "controlPanel.parks.title" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
