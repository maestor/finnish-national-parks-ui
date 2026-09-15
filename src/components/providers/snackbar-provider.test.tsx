import { act, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../../messages/fi.json";
import { SnackbarProvider, useSnackbar } from "./snackbar-provider";

const SnackbarHarness = () => {
  const { showSnackbar } = useSnackbar();
  const [count, setCount] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCount((current) => current + 1);
          showSnackbar({
            message: `Tallennettu ${count + 1}`,
            tone: "success",
          });
        }}
      >
        Show success
      </button>
      <button
        type="button"
        onClick={() =>
          showSnackbar({
            action: { href: "/hallinta", label: "Avaa hallinta" },
            message: "Jokin meni pieleen",
            tone: "error",
          })
        }
      >
        Show error
      </button>
    </>
  );
};

const renderSnackbar = () =>
  render(
    <NextIntlClientProvider locale="fi" messages={messages}>
      <SnackbarProvider>
        <SnackbarHarness />
      </SnackbarProvider>
    </NextIntlClientProvider>,
  );

describe("SnackbarProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows an accessible success notification that can be closed manually", () => {
    renderSnackbar();

    fireEvent.click(screen.getByRole("button", { name: "Show success" }));

    const snackbar = screen.getByRole("status");
    expect(snackbar).toHaveTextContent("Tallennettu 1");
    expect(snackbar.parentElement).toHaveClass("fixed", "bottom-4", "inset-x-4");
    expect(screen.getByRole("button", { name: "layout.snackbar.close" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "layout.snackbar.close" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("replaces the current notification and dismisses it automatically", () => {
    vi.useFakeTimers();
    renderSnackbar();

    fireEvent.click(screen.getByRole("button", { name: "Show success" }));
    fireEvent.click(screen.getByRole("button", { name: "Show error" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Jokin meni pieleen");
    expect(screen.getByRole("link", { name: "Avaa hallinta" })).toHaveAttribute(
      "href",
      "/hallinta",
    );

    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
