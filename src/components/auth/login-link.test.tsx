import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginLink } from "./login-link";

vi.mock("next/navigation", () => ({ usePathname: () => window.location.pathname }));

describe("LoginLink", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("includes the public page, query and fragment in navigation login links", () => {
    window.history.replaceState({}, "", "/park/pallas?tab=history#kuvat");

    render(<LoginLink returnToCurrentPage>Kirjaudu</LoginLink>);

    const link = screen.getByRole("link", { name: "Kirjaudu" });
    const url = new URL(link.getAttribute("href") ?? "", window.location.origin);
    expect(url.pathname).toBe("/auth/login");
    expect(url.searchParams.get("returnTo")).toBe("/paikka/pallas?tab=history#kuvat");
  });

  it("captures the latest location when activated with the keyboard", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <LoginLink returnToCurrentPage onClick={onClick}>
        Kirjaudu
      </LoginLink>,
    );
    const link = screen.getByRole("link", { name: "Kirjaudu" });
    link.addEventListener("click", (event) => event.preventDefault());
    window.history.replaceState({}, "", "/retki/lappi?day=2#kuvat");

    await user.tab();
    expect(link).toHaveFocus();
    await user.keyboard("{Enter}");

    const url = new URL(link.getAttribute("href") ?? "", window.location.origin);
    expect(url.searchParams.get("returnTo")).toBe("/retki/lappi?day=2#kuvat");
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("retains the destination for modified and middle-click activation", () => {
    render(<LoginLink returnToCurrentPage>Kirjaudu</LoginLink>);
    const link = screen.getByRole("link", { name: "Kirjaudu" });
    link.addEventListener("click", (event) => event.preventDefault());
    link.addEventListener("auxclick", (event) => event.preventDefault());
    window.history.replaceState({}, "", "/paikka/pallas#vierailut");

    fireEvent.click(link, { ctrlKey: true });
    fireEvent(link, new MouseEvent("auxclick", { bubbles: true, button: 1 }));

    const url = new URL(link.getAttribute("href") ?? "", window.location.origin);
    expect(url.searchParams.get("returnTo")).toBe("/paikka/pallas#vierailut");
  });

  it("starts login without a return destination from the login-page action", () => {
    window.history.replaceState({}, "", "/kirjaudu?error=auth_failed");
    render(<LoginLink>Kirjaudu Googlella</LoginLink>);

    expect(screen.getByRole("link", { name: "Kirjaudu Googlella" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
  });

  it("omits non-returnable login and admin paths even in navigation", async () => {
    window.history.replaceState({}, "", "/hallinta");
    render(<LoginLink returnToCurrentPage>Kirjaudu</LoginLink>);

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Kirjaudu" })).toHaveAttribute("href", "/auth/login"),
    );
  });
});
