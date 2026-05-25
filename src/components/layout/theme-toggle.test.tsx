import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";

const { themeState, setThemeMock } = vi.hoisted(() => ({
  themeState: {
    value: "light",
  },
  setThemeMock: vi.fn(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: themeState.value,
    setTheme: setThemeMock,
  }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    themeState.value = "light";
    setThemeMock.mockReset();
  });

  it("switches from light mode to dark mode", async () => {
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole("button", { name: "layout.themeToggle.srLabel" }));

    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });

  it("switches from dark mode back to light mode", async () => {
    themeState.value = "dark";

    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole("button", { name: "layout.themeToggle.srLabel" }));

    expect(setThemeMock).toHaveBeenCalledWith("light");
  });

  it("shows the target mode label when rendered as a menu row", () => {
    render(<ThemeToggle showLabel />);

    expect(screen.getByRole("button", { name: "layout.themeToggle.darkMode" })).toBeInTheDocument();
  });

  it("exposes a hover title and pointer cursor in icon mode", () => {
    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "layout.themeToggle.srLabel" })).toHaveAttribute(
      "title",
      "layout.themeToggle.dark",
    );
    expect(screen.getByRole("button", { name: "layout.themeToggle.srLabel" })).toHaveClass(
      "cursor-pointer",
    );
  });
});
