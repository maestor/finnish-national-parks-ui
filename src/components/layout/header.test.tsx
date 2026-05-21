import { HomeMapControlsProvider } from "@/components/providers/home-map-controls-provider";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "./header";

const { authState, pathnameState } = vi.hoisted(() => ({
  authState: {
    isAuthenticated: false,
    isLoading: true,
    logout: vi.fn(),
  },
  pathnameState: {
    value: "/",
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ ...authState, user: null }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("./home-park-search", () => ({
  HomeParkSearch: () => <div>home-park-search</div>,
}));

describe("Header", () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.isLoading = true;
    authState.logout.mockClear();
    pathnameState.value = "/";
  });

  it("renders site title link", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: "layout.siteTitle" })).toBeInTheDocument();
  });

  it("renders theme toggle button", () => {
    render(<Header />);
    expect(screen.getByRole("button", { name: "layout.themeToggle.srLabel" })).toBeInTheDocument();
  });

  it("shows the login link for unauthenticated users when auth loading has finished", () => {
    authState.isLoading = false;

    render(<Header />);

    expect(screen.getByRole("link", { name: "layout.nav.login" })).toHaveAttribute(
      "href",
      "http://localhost:3004/auth/google",
    );
  });

  it("shows a control panel link for authenticated users outside the control panel", () => {
    authState.isAuthenticated = true;
    authState.isLoading = false;
    pathnameState.value = "/";

    render(<Header />);

    expect(screen.getByRole("link", { name: "layout.nav.controlPanel" })).toHaveAttribute(
      "href",
      "/control-panel",
    );
  });

  it("shows a logout button inside the control panel and calls logout", async () => {
    authState.isAuthenticated = true;
    authState.isLoading = false;
    pathnameState.value = "/control-panel/visits";

    render(<Header />);

    await userEvent.click(screen.getByRole("button", { name: "layout.nav.logout" }));

    expect(authState.logout).toHaveBeenCalled();
  });

  it("toggles the mobile filters button state on the home page", async () => {
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
