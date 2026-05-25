import { render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";
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

describe("HomeMapControlsProvider", () => {
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
    searchParamsState.value = "park=hossa&filter=visited";
    replaceMock.mockReset();

    render(
      <HomeMapControlsProvider>
        <FocusProbe />
      </HomeMapControlsProvider>,
    );

    expect(screen.getByTestId("seen-request")).toHaveTextContent("hossa");

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/parks?filter=visited", { scroll: false });
    });

    expect(screen.getByTestId("focus-request")).toHaveTextContent("none");
  });
});
