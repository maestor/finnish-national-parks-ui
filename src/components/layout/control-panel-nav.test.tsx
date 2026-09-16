import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ControlPanelNav } from "./control-panel-nav";

const { authState, mockPush, pathnameState } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  authState: {
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
    user: {
      email: "super@example.com",
      id: "super-sub",
      isSuperAdmin: true,
      name: "Super",
      picture: "",
    },
  },
  pathnameState: { value: "/control-panel" },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authState,
}));

describe("ControlPanelNav", () => {
  beforeEach(() => {
    mockPush.mockReset();
    pathnameState.value = "/control-panel";
    authState.user.isSuperAdmin = true;
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
    expect(
      within(nav).getByRole("link", { name: "controlPanel.dateRangeReview.title" }),
    ).toHaveAttribute("href", "/hallinta/ajanjaksokatsaus");
    expect(
      within(nav).getByRole("link", { name: "controlPanel.yearReview.title" }),
    ).toHaveAttribute("href", "/hallinta/vuosikatsaus");
    expect(
      within(nav).getByRole("link", { name: "controlPanel.adminUsers.title" }),
    ).toHaveAttribute("href", "/hallinta/kayttajat");
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

  it("provides a compact mobile section switcher that navigates to the selected section", async () => {
    const user = userEvent.setup();

    render(<ControlPanelNav />);

    const sectionSwitcher = screen.getByRole("combobox", {
      name: "controlPanel.sectionLabel",
    });

    expect(sectionSwitcher).toHaveValue("/hallinta");

    await user.selectOptions(sectionSwitcher, "/hallinta/retket");

    expect(mockPush).toHaveBeenCalledWith("/hallinta/retket");
  });

  it("keeps the parent section selected on nested admin pages", () => {
    pathnameState.value = "/hallinta/retket/123/muokkaa";

    render(<ControlPanelNav />);

    expect(screen.getByRole("combobox", { name: "controlPanel.sectionLabel" })).toHaveValue(
      "/hallinta/retket",
    );
    expect(screen.getByRole("link", { name: "controlPanel.trips.title" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("hides the admin users link for normal admins", () => {
    authState.user.isSuperAdmin = false;

    render(<ControlPanelNav />);

    expect(screen.queryByRole("link", { name: "controlPanel.adminUsers.title" })).toBeNull();
  });
});
