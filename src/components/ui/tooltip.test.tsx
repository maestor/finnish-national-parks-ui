import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { resolveTooltipPosition, Tooltip } from "./tooltip";

describe("Tooltip", () => {
  it("shows tooltip content when the trigger receives keyboard focus", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip content="Kopioi linkki">
        {({ isOpen, tooltipId }) => (
          <button type="button" aria-describedby={isOpen ? tooltipId : undefined}>
            Avaa
          </button>
        )}
      </Tooltip>,
    );

    await user.tab();

    expect(screen.getByRole("button", { name: "Avaa" })).toHaveAttribute("aria-describedby");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Kopioi linkki");
  });

  it("renders a reusable success status when forced open", () => {
    render(
      <Tooltip content="Linkki kopioitu" open role="status" live="polite" tone="success">
        {({ isOpen, tooltipId }) => (
          <button type="button" aria-describedby={isOpen ? tooltipId : undefined}>
            Avaa
          </button>
        )}
      </Tooltip>,
    );

    expect(screen.getByRole("button", { name: "Avaa" })).toHaveAttribute("aria-describedby");
    expect(screen.getByRole("status")).toHaveTextContent("Linkki kopioitu");
  });

  it("supports bottom placement for reusable callers", () => {
    render(
      <Tooltip content="Alapuolella" open side="bottom">
        {({ isOpen, tooltipId }) => (
          <button type="button" aria-describedby={isOpen ? tooltipId : undefined}>
            Avaa
          </button>
        )}
      </Tooltip>,
    );

    expect(screen.getByRole("tooltip")).toHaveClass("fixed");
    expect(screen.getByRole("tooltip")).toHaveAttribute("data-side", "bottom");
  });

  it("suppresses the interaction tooltip after a controlled-open status closes until pointer exit", async () => {
    const user = userEvent.setup();

    const TooltipHarness = () => {
      const [isStatusOpen, setIsStatusOpen] = useState(false);

      return (
        <>
          <Tooltip
            content={isStatusOpen ? "Linkki kopioitu" : "Kopioi linkki"}
            open={isStatusOpen}
            role={isStatusOpen ? "status" : "tooltip"}
            suppressInteractionAfterOpen
            tone={isStatusOpen ? "success" : "default"}
          >
            {({ isOpen, tooltipId }) => (
              <button
                type="button"
                aria-describedby={isOpen ? tooltipId : undefined}
                onClick={() => setIsStatusOpen((current) => !current)}
              >
                Avaa
              </button>
            )}
          </Tooltip>
          <button type="button">Toinen</button>
        </>
      );
    };

    render(<TooltipHarness />);

    const trigger = screen.getByRole("button", { name: "Avaa" });

    await user.hover(trigger);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Kopioi linkki");

    await user.click(trigger);
    expect(screen.getByRole("status")).toHaveTextContent("Linkki kopioitu");

    await user.click(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.unhover(trigger);
    await user.hover(trigger);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Kopioi linkki");
  });

  it("clears the interaction tooltip when the window loses focus", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip content="Kopioi linkki">
        {({ isOpen, tooltipId }) => (
          <button type="button" aria-describedby={isOpen ? tooltipId : undefined}>
            Avaa
          </button>
        )}
      </Tooltip>,
    );

    const trigger = screen.getByRole("button", { name: "Avaa" });

    await user.hover(trigger);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Kopioi linkki");

    await act(async () => {
      window.dispatchEvent(new Event("blur"));
    });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("keeps the default tooltip suppressed when focus leaves the browser after copying", async () => {
    const user = userEvent.setup();

    const TooltipHarness = () => {
      const [isStatusOpen, setIsStatusOpen] = useState(false);

      return (
        <>
          <Tooltip
            content={isStatusOpen ? "Linkki kopioitu" : "Kopioi linkki"}
            open={isStatusOpen}
            role={isStatusOpen ? "status" : "tooltip"}
            suppressInteractionAfterOpen
            tone={isStatusOpen ? "success" : "default"}
          >
            {({ isOpen, tooltipId }) => (
              <button
                type="button"
                aria-describedby={isOpen ? tooltipId : undefined}
                onClick={() => setIsStatusOpen(true)}
              >
                Avaa
              </button>
            )}
          </Tooltip>
          <button type="button" onClick={() => setIsStatusOpen(false)}>
            Sulje
          </button>
        </>
      );
    };

    render(<TooltipHarness />);

    const trigger = screen.getByRole("button", { name: "Avaa" });

    await user.hover(trigger);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Kopioi linkki");

    await user.click(trigger);
    expect(screen.getByRole("status")).toHaveTextContent("Linkki kopioitu");

    fireEvent.blur(trigger, { relatedTarget: null });
    fireEvent.click(screen.getByRole("button", { name: "Sulje" }));

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("falls back below the trigger when there is not enough room above", () => {
    const position = resolveTooltipPosition({
      preferredSide: "top",
      tooltipHeight: 48,
      tooltipWidth: 140,
      triggerRect: {
        height: 32,
        left: 80,
        top: 10,
        width: 40,
      },
      viewportHeight: 240,
      viewportWidth: 320,
    });

    expect(position.resolvedSide).toBe("bottom");
    expect(position.top).toBeGreaterThan(10);
  });

  it("falls back horizontally and stays inside the viewport near the right edge", () => {
    const position = resolveTooltipPosition({
      preferredSide: "right",
      tooltipHeight: 40,
      tooltipWidth: 120,
      triggerRect: {
        height: 24,
        left: 280,
        top: 40,
        width: 20,
      },
      viewportHeight: 240,
      viewportWidth: 320,
    });

    expect(position.resolvedSide).toBe("left");
    expect(position.left).toBeGreaterThanOrEqual(8);
    expect(position.left + 120).toBeLessThanOrEqual(312);
  });

  it("clamps oversized tooltips within the viewport bounds", () => {
    const position = resolveTooltipPosition({
      preferredSide: "top",
      tooltipHeight: 96,
      tooltipWidth: 260,
      triggerRect: {
        height: 20,
        left: 4,
        top: 6,
        width: 16,
      },
      viewportHeight: 140,
      viewportWidth: 280,
    });

    expect(position.left).toBeGreaterThanOrEqual(8);
    expect(position.top).toBeGreaterThanOrEqual(8);
    expect(position.left + 260).toBeLessThanOrEqual(272);
    expect(position.top + 96).toBeLessThanOrEqual(132);
  });
});
