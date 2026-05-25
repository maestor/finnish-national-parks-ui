import { render, screen } from "@testing-library/react";
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
  const { homeParkFocusRequest } = useHomeMapControls();

  return <div data-testid="focus-request">{homeParkFocusRequest?.slug ?? "none"}</div>;
};

describe("HomeMapControlsProvider", () => {
  it("consumes the park query param once on the parks page and clears it from the url", () => {
    pathnameState.value = "/parks";
    searchParamsState.value = "park=hossan-kansallispuisto";
    replaceMock.mockReset();

    render(
      <HomeMapControlsProvider>
        <FocusProbe />
      </HomeMapControlsProvider>,
    );

    expect(screen.getByTestId("focus-request")).toHaveTextContent("hossan-kansallispuisto");
    expect(replaceMock).toHaveBeenCalledWith("/parks", { scroll: false });
  });

  it("preserves other search params when clearing the park query", () => {
    pathnameState.value = "/parks";
    searchParamsState.value = "park=hossa&filter=visited";
    replaceMock.mockReset();

    render(
      <HomeMapControlsProvider>
        <FocusProbe />
      </HomeMapControlsProvider>,
    );

    expect(screen.getByTestId("focus-request")).toHaveTextContent("hossa");
    expect(replaceMock).toHaveBeenCalledWith("/parks?filter=visited", { scroll: false });
  });
});
