import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RouteError } from "./route-error";

describe("RouteError", () => {
  it("shows an accessible alert with a retry action", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();

    render(<RouteError error={new Error("backend down")} reset={reset} />);

    const alert = screen.getByRole("alert");
    expect(alert).toContainElement(
      screen.getByRole("heading", { name: "errors.generic.routeErrorTitle" }),
    );
    expect(screen.getByText("errors.generic.routeErrorDescription")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "errors.generic.routeErrorRetry" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
