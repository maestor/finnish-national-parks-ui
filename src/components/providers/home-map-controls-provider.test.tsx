import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeMapControlsProvider, useHomeMapControls } from "./home-map-controls-provider";

const { pathnameState, searchParamsState, replaceMock } = vi.hoisted(() => ({
  pathnameState: { value: "/" },
  searchParamsState: { value: "" },
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

const FocusProbe = () => {
  const { homeParkFocusRequest, clearHomeParkFocusRequest } = useHomeMapControls();
  const [seenSlug, setSeenSlug] = useState<string>("none");

  useEffect(() => {
    if (homeParkFocusRequest) {
      setSeenSlug(homeParkFocusRequest.slug);
      clearHomeParkFocusRequest();
    }
  }, [clearHomeParkFocusRequest, homeParkFocusRequest]);

  return (
    <>
      <div data-testid="focus-request">{homeParkFocusRequest?.slug ?? "none"}</div>
      <div data-testid="seen-request">{seenSlug}</div>
    </>
  );
};

const StaleClearProbe = () => {
  const { homeParkFocusRequest, clearHomeParkFocusRequest, focusParkOnHome } = useHomeMapControls();

  return (
    <>
      <button type="button" onClick={() => focusParkOnHome("hossa")}>
        focus-hossa
      </button>
      <button type="button" onClick={() => focusParkOnHome("teijo")}>
        focus-teijo
      </button>
      <button
        type="button"
        onClick={() => {
          if (!homeParkFocusRequest) {
            return;
          }

          window.setTimeout(() => {
            clearHomeParkFocusRequest(homeParkFocusRequest.requestId);
          }, 0);
        }}
      >
        schedule-clear-current
      </button>
      <div data-testid="focus-request">{homeParkFocusRequest?.slug ?? "none"}</div>
      <div data-testid="focus-request-id">{homeParkFocusRequest?.requestId ?? 0}</div>
    </>
  );
};

describe("HomeMapControlsProvider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears the park query param after the map consumes the focus request", async () => {
    pathnameState.value = "/parks";
    searchParamsState.value = "park=hossan-kansallispuisto";
    replaceMock.mockReset();

    render(
      <HomeMapControlsProvider>
        <FocusProbe />
      </HomeMapControlsProvider>,
    );

    expect(screen.getByTestId("seen-request")).toHaveTextContent("hossan-kansallispuisto");

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/parks", { scroll: false });
    });

    expect(screen.getByTestId("focus-request")).toHaveTextContent("none");
  });

  it("preserves other search params when clearing the park query after consume", async () => {
    pathnameState.value = "/parks";
    searchParamsState.value = "park=hossa&visitStatus=visited";
    replaceMock.mockReset();

    render(
      <HomeMapControlsProvider>
        <FocusProbe />
      </HomeMapControlsProvider>,
    );

    expect(screen.getByTestId("seen-request")).toHaveTextContent("hossa");

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/parks?visitStatus=visited", { scroll: false });
    });

    expect(screen.getByTestId("focus-request")).toHaveTextContent("none");
  });

  it("ignores a stale clear after a newer focus request replaces the current one", () => {
    vi.useFakeTimers();
    pathnameState.value = "/parks";
    searchParamsState.value = "";

    render(
      <HomeMapControlsProvider>
        <StaleClearProbe />
      </HomeMapControlsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "focus-hossa" }));
    expect(screen.getByTestId("focus-request")).toHaveTextContent("hossa");

    fireEvent.click(screen.getByRole("button", { name: "schedule-clear-current" }));
    fireEvent.click(screen.getByRole("button", { name: "focus-teijo" }));
    expect(screen.getByTestId("focus-request")).toHaveTextContent("teijo");

    vi.runAllTimers();

    expect(screen.getByTestId("focus-request")).toHaveTextContent("teijo");
  });

  it("keeps incrementing focus request ids after previous requests are cleared", () => {
    vi.useFakeTimers();
    pathnameState.value = "/parks";
    searchParamsState.value = "";

    render(
      <HomeMapControlsProvider>
        <StaleClearProbe />
      </HomeMapControlsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "focus-hossa" }));
    expect(screen.getByTestId("focus-request-id")).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "schedule-clear-current" }));
    act(() => {
      vi.runAllTimers();
    });
    expect(screen.getByTestId("focus-request")).toHaveTextContent("none");

    fireEvent.click(screen.getByRole("button", { name: "focus-teijo" }));
    expect(screen.getByTestId("focus-request")).toHaveTextContent("teijo");
    expect(screen.getByTestId("focus-request-id")).toHaveTextContent("2");
  });
});
