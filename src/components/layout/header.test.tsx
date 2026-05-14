import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Header } from "./header";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: true, logout: vi.fn(), user: null }),
}));

vi.mock("./home-park-search", () => ({
  HomeParkSearch: () => <div>home-park-search</div>,
}));

describe("Header", () => {
  it("renders site title link", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: "layout.siteTitle" })).toBeInTheDocument();
  });

  it("renders theme toggle button", () => {
    render(<Header />);
    expect(screen.getByRole("button", { name: "layout.themeToggle.srLabel" })).toBeInTheDocument();
  });
});
