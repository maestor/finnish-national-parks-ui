import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeferredMap, useDeferredMapPower } from "./deferred-map";

const observers: MockIntersectionObserver[] = [];

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  disconnect = vi.fn();
  observe = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observers.push(this);
  }

  trigger = (isIntersecting: boolean) => {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  };
}

describe("DeferredMap", () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderDeferredMap = () =>
    render(
      <DeferredMap className="h-80" label="Optional map">
        <DeferredMapContent />
      </DeferredMap>,
    );

  const DeferredMapContent = () => {
    const isLowPower = useDeferredMapPower();

    return <div data-testid="deferred-map-content" data-low-power={isLowPower} />;
  };

  it("waits for visibility before mounting the map", () => {
    renderDeferredMap();

    expect(screen.getByRole("button", { name: "map.loadDeferredMap" })).toBeInTheDocument();
    expect(screen.queryByTestId("deferred-map-content")).not.toBeInTheDocument();

    act(() => {
      observers[0]?.trigger(true);
    });

    expect(screen.getByTestId("deferred-map-content")).toBeInTheDocument();
  });

  it("keeps the map deferred while the container is outside the viewport", () => {
    renderDeferredMap();

    act(() => {
      observers[0]?.trigger(false);
    });

    expect(screen.queryByTestId("deferred-map-content")).not.toBeInTheDocument();
  });

  it("loads immediately when viewport observation is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    renderDeferredMap();

    expect(screen.getByTestId("deferred-map-content")).toBeInTheDocument();
  });

  it("supports an explicit load action and low-power mode", () => {
    renderDeferredMap();

    fireEvent.click(screen.getByRole("button", { name: "map.loadDeferredMap" }));
    expect(screen.getByTestId("deferred-map-content")).toHaveAttribute("data-low-power", "false");

    fireEvent.click(screen.getByRole("checkbox", { name: "map.lowPowerMode" }));
    expect(screen.getByTestId("deferred-map-content")).toHaveAttribute("data-low-power", "true");
  });

  it("can wait for an explicit action without observing the viewport", () => {
    render(
      <DeferredMap autoLoad={false} className="h-80" label="Optional map">
        <DeferredMapContent />
      </DeferredMap>,
    );

    expect(observers).toHaveLength(0);
    expect(screen.queryByTestId("deferred-map-content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "map.loadDeferredMap" }));

    expect(screen.getByTestId("deferred-map-content")).toBeInTheDocument();
  });

  it("can hide the manual load action while still waiting for visibility", () => {
    render(
      <DeferredMap showLoadAction={false} className="h-80" label="Trip map">
        <DeferredMapContent />
      </DeferredMap>,
    );

    expect(screen.queryByRole("button", { name: "map.loadDeferredMap" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("deferred-map-content")).not.toBeInTheDocument();

    act(() => {
      observers[0]?.trigger(true);
    });

    expect(screen.getByTestId("deferred-map-content")).toBeInTheDocument();
  });

  it("can mount immediately without showing a manual load action", () => {
    render(
      <DeferredMap loadImmediately showLoadAction={false} className="h-80" label="Trip map">
        <DeferredMapContent />
      </DeferredMap>,
    );

    expect(observers).toHaveLength(0);
    expect(screen.getByTestId("deferred-map-content")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "map.loadDeferredMap" })).not.toBeInTheDocument();
  });
});
