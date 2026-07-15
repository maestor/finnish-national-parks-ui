import { HomeMapControlsProvider } from "@/components/providers/home-map-controls-provider";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "./header";

const { authState, pathnameState, searchParamsState, setThemeMock, themeState } = vi.hoisted(
  () => ({
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
    setThemeMock: vi.fn(),
    themeState: {
      value: "light",
    },
  }),
);

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ ...authState, user: null }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: themeState.value,
    setTheme: setThemeMock,
  }),
}));

vi.mock("./home-park-search", () => ({
  HomeParkSearch: () => <div>home-park-search</div>,
}));

const setWindowScrollY = (value: number) => {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value,
    writable: true,
  });
};

describe("Header", () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.isLoading = true;
    authState.logout.mockClear();
    pathnameState.value = "/parks";
    searchParamsState.value = "";
    themeState.value = "light";
    setThemeMock.mockReset();
    setWindowScrollY(0);
  });

  it("renders the site title link to the parks map", () => {
    render(<Header />);

    const siteTitleLink = screen.getByRole("link", { name: "layout.siteTitle" });

    expect(siteTitleLink).toHaveAttribute("href", "/parks");
    expect(within(siteTitleLink).getByTestId("header-brand-mark")).toBeInTheDocument();
  });

  it("keeps the sticky header overflow visible for layered search and menus", () => {
    const { container } = render(<Header />);

    expect(container.querySelector("header")).not.toHaveClass("overflow-hidden");
  });

  it("slides the header away on downward scroll and reveals it on upward scroll", async () => {
    const { container } = render(<Header />);
    const header = container.querySelector("header");

    expect(header).toHaveClass("translate-y-0");

    setWindowScrollY(140);
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(header).toHaveClass("-translate-y-full");
    });

    setWindowScrollY(88);
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(header).toHaveClass("translate-y-0");
    });
  });

  it("keeps the header visible while the mobile menu is open", async () => {
    const user = userEvent.setup();
    const { container } = render(<Header />);
    const header = container.querySelector("header");

    await user.click(screen.getByRole("button", { name: "layout.nav.menu" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "layout.nav.menu" })).toHaveClass("translate-x-0");
    });

    setWindowScrollY(220);
    fireEvent.scroll(window);

    expect(header).toHaveClass("translate-y-0");
  });

  it("renders theme toggle button", () => {
    render(<Header />);
    expect(screen.getByRole("button", { name: "layout.themeToggle.srLabel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "layout.themeToggle.srLabel" })).toHaveAttribute(
      "title",
      "layout.themeToggle.dark",
    );
  });

  it("shows the desktop login icon for unauthenticated users when auth loading has finished", () => {
    authState.isLoading = false;

    render(<Header />);

    expect(screen.getByRole("link", { name: "layout.nav.login" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
    expect(screen.getByRole("link", { name: "layout.nav.login" })).toHaveAttribute(
      "title",
      "layout.nav.login",
    );
  });

  it("shows the desktop control panel link for authenticated users outside the control panel", () => {
    authState.isAuthenticated = true;
    authState.isLoading = false;
    pathnameState.value = "/parks";

    render(<Header />);

    expect(screen.getByRole("link", { name: "layout.nav.controlPanel" })).toHaveAttribute(
      "href",
      "/control-panel",
    );
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

  it("shows desktop navigation links for home and map", () => {
    pathnameState.value = "/parks";

    render(<Header />);

    expect(screen.getByRole("link", { name: "layout.nav.home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "layout.nav.map" })).toHaveAttribute("href", "/parks");
    expect(screen.getByRole("link", { name: "layout.nav.visits" })).toHaveAttribute(
      "href",
      "/visits",
    );
    expect(screen.getByRole("link", { name: "layout.nav.tripPlanner" })).toHaveAttribute(
      "href",
      "/trip-planner",
    );
  });

  it("marks the visits page link as current on the public visits route", () => {
    pathnameState.value = "/visits";

    render(<Header />);

    expect(screen.getByRole("link", { name: "layout.nav.visits" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks the trip planner link as current on the trip planner route", () => {
    pathnameState.value = "/trip-planner";

    render(<Header />);

    expect(screen.getByRole("link", { name: "layout.nav.tripPlanner" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows a desktop logout icon and calls logout", async () => {
    authState.isAuthenticated = true;
    authState.isLoading = false;
    pathnameState.value = "/control-panel/visits";

    render(<Header />);

    const logoutButton = screen.getByRole("button", { name: "layout.nav.logout" });

    expect(logoutButton).toHaveAttribute("title", "layout.nav.logout");

    await userEvent.click(logoutButton);

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

  it("opens a mobile menu sheet with navigation and session actions", async () => {
    authState.isAuthenticated = true;
    authState.isLoading = false;

    render(<Header />);

    await userEvent.click(screen.getByRole("button", { name: "layout.nav.menu" }));

    const dialog = screen.getByRole("dialog", { name: "layout.nav.menu" });

    await waitFor(() => {
      expect(dialog).toHaveClass("translate-x-0");
    });
    expect(within(dialog).getByRole("link", { name: "layout.nav.home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(within(dialog).getByRole("link", { name: "layout.nav.map" })).toHaveAttribute(
      "href",
      "/parks",
    );
    expect(within(dialog).getByRole("link", { name: "layout.nav.visits" })).toHaveAttribute(
      "href",
      "/visits",
    );
    expect(within(dialog).getByRole("link", { name: "layout.nav.controlPanel" })).toHaveAttribute(
      "href",
      "/control-panel",
    );
    expect(
      within(dialog).getByRole("button", { name: "layout.themeToggle.darkMode" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "layout.nav.logout" })).toBeInTheDocument();
    expect(dialog.parentElement?.parentElement).toBe(document.body);
  });
});
