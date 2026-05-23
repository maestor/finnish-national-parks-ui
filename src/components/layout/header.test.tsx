import { HomeMapControlsProvider } from "@/components/providers/home-map-controls-provider";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "./header";

const { authState, pathnameState, searchParamsState } = vi.hoisted(() => ({
  authState: {
    isAuthenticated: false,
    isLoading: true,
    logout: vi.fn(),
  },
  pathnameState: {
    value: "/",
  },
  searchParamsState: {
    value: "",
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ ...authState, user: null }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

vi.mock("./home-park-search", () => ({
  HomeParkSearch: () => <div>home-park-search</div>,
}));

describe("Header", () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.isLoading = true;
    authState.logout.mockClear();
    pathnameState.value = "/parks";
    searchParamsState.value = "";
  });

  it("renders the site title link to the parks map", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: "layout.siteTitle" })).toHaveAttribute(
      "href",
      "/parks",
    );
  });

  it("renders theme toggle button", () => {
    render(<Header />);
    expect(screen.getByRole("button", { name: "layout.themeToggle.srLabel" })).toBeInTheDocument();
  });

  it("shows mobile and desktop login links for unauthenticated users when auth loading has finished", () => {
    authState.isLoading = false;

    const { container } = render(<Header />);

    const loginLinks = container.querySelectorAll('a[href="http://localhost:3004/auth/google"]');

    expect(loginLinks).toHaveLength(2);
    expect(loginLinks[0]).toHaveAttribute("href", "http://localhost:3004/auth/google");
    expect(loginLinks[1]).toHaveAttribute("href", "http://localhost:3004/auth/google");
  });

  it("shows mobile and desktop control panel links for authenticated users outside the control panel", () => {
    authState.isAuthenticated = true;
    authState.isLoading = false;
    pathnameState.value = "/parks";

    render(<Header />);

    const controlPanelLinks = screen.getAllByRole("link", { name: "layout.nav.controlPanel" });

    expect(controlPanelLinks).toHaveLength(2);
    expect(controlPanelLinks[0]).toHaveAttribute("href", "/control-panel");
    expect(controlPanelLinks[1]).toHaveAttribute("href", "/control-panel");
  });

  it("keeps park search available outside the parks map page", () => {
    pathnameState.value = "/control-panel/visits";

    render(
      <HomeMapControlsProvider>
        <Header />
      </HomeMapControlsProvider>,
    );

    expect(screen.getByText("home-park-search")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "layout.nav.filters" })).not.toBeInTheDocument();
  });

  it("shows mobile and desktop home links outside the root page", () => {
    pathnameState.value = "/parks";

    render(<Header />);

    const homeLinks = screen.getAllByRole("link", { name: "layout.nav.home" });

    expect(homeLinks).toHaveLength(2);
    expect(homeLinks[0]).toHaveAttribute("href", "/");
    expect(homeLinks[1]).toHaveAttribute("href", "/");
  });

  it("shows a logout button inside the control panel and calls logout", async () => {
    authState.isAuthenticated = true;
    authState.isLoading = false;
    pathnameState.value = "/control-panel/visits";

    render(<Header />);

    const logoutButtons = screen.getAllByRole("button", { name: "layout.nav.logout" });

    expect(logoutButtons).toHaveLength(2);

    await userEvent.click(logoutButtons[0]);

    expect(authState.logout).toHaveBeenCalled();
  });

  it("toggles the mobile filters button state on the parks map page", async () => {
    render(
      <HomeMapControlsProvider>
        <Header />
      </HomeMapControlsProvider>,
    );

    const toggle = screen.getByRole("button", { name: "layout.nav.filters" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("home-park-search")).toBeInTheDocument();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
