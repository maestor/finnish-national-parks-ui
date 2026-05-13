import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Header } from "./header";

describe("Header", () => {
  it("renders site title link", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: "layout.siteTitle" })).toBeInTheDocument();
  });

  it("renders theme toggle button", () => {
    render(<Header />);
    expect(screen.getByRole("button", { name: "layout.themeToggle.dark" })).toBeInTheDocument();
  });
});
