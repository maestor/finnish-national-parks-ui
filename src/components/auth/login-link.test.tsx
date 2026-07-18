import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LoginLink } from "./login-link";

describe("LoginLink", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("stores the current public page before starting auth", async () => {
    window.history.replaceState({}, "", "/park/pallas?tab=history");

    render(<LoginLink>Kirjaudu</LoginLink>);

    const link = screen.getByRole("link", { name: "Kirjaudu" });
    expect(link).toHaveAttribute("href", "/auth/login");
    link.addEventListener("click", (event) => event.preventDefault());

    fireEvent.click(link);

    expect(window.sessionStorage.getItem("post-login-redirect-path")).toBe(
      "/paikka/pallas?tab=history",
    );
  });

  it("does not store non-returnable paths", async () => {
    window.history.replaceState({}, "", "/control-panel");

    render(<LoginLink>Kirjaudu</LoginLink>);

    const link = screen.getByRole("link", { name: "Kirjaudu" });
    link.addEventListener("click", (event) => event.preventDefault());

    fireEvent.click(link);

    expect(window.sessionStorage.getItem("post-login-redirect-path")).toBeNull();
  });
});
