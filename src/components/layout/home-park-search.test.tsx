import {
  HomeMapControlsProvider,
  useHomeMapControls,
} from "@/components/providers/home-map-controls-provider";
import { apiFetch } from "@/lib/api";
import type { Park } from "@/lib/parks";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeParkSearch } from "./home-park-search";

const { mockPush, pathnameState, searchParamsState } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  pathnameState: {
    value: "/",
  },
  searchParamsState: {
    value: "",
  },
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => pathnameState.value,
  useSearchParams: () => new URLSearchParams(searchParamsState.value),
}));

const parks: Park[] = [
  {
    slug: "paijanne",
    name: "Päijänteen kansallispuisto",
    areaKm2: 14,
    locationLabel: "Päijät-Häme",
    luontoonUrl: null,
    establishmentYear: 1993,
    boundingBox: { minLat: 61, minLon: 25, maxLat: 62, maxLon: 26 },
    markerPoint: { lat: 61.5, lon: 25.5 },
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
  },
  {
    slug: "teijo",
    name: "Teijon kansallispuisto",
    areaKm2: 11,
    locationLabel: "Varsinais-Suomi",
    luontoonUrl: null,
    establishmentYear: 2015,
    boundingBox: { minLat: 60, minLon: 22, maxLat: 61, maxLon: 23 },
    markerPoint: { lat: 60.5, lon: 22.5 },
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
  },
];

const FocusRequestProbe = () => {
  const { homeParkFocusRequest } = useHomeMapControls();

  return <div data-testid="focus-request">{homeParkFocusRequest?.slug ?? "none"}</div>;
};

const renderSearch = () =>
  render(
    <HomeMapControlsProvider>
      <HomeParkSearch />
      <FocusRequestProbe />
    </HomeMapControlsProvider>,
  );

describe("HomeParkSearch", () => {
  beforeEach(() => {
    mockPush.mockReset();
    pathnameState.value = "/parks";
    searchParamsState.value = "";
  });

  it("filters parks by query and activates the matching park on the parks map", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "päij" } });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Päijänteen kansallispuisto/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Päijänteen kansallispuisto/i }));

    expect(screen.getByTestId("focus-request")).toHaveTextContent("paijanne");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to a park page when search is used outside the parks map page", async () => {
    pathnameState.value = "/park/pallas";
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "päij" } });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Päijänteen kansallispuisto/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Päijänteen kansallispuisto/i }));

    expect(mockPush).toHaveBeenCalledWith("/park/paijanne");
  });

  it("shows an empty state when no parks match the query", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "xyz" } });

    await waitFor(() => {
      expect(screen.getByText("layout.parkSearch.empty")).toBeInTheDocument();
    });
  });

  it("falls back to an empty result set if park loading fails", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("offline"));

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText("layout.parkSearch.empty")).toBeInTheDocument();
    });
  });

  it("supports keyboard navigation from the desktop search field", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });

    fireEvent.keyDown(input, { key: "ArrowDown" });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Päijänteen kansallispuisto/i }),
      ).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByTestId("focus-request")).toHaveTextContent("paijanne");
  });

  it("supports moving the highlight back upward from the desktop search field", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    await screen.findByRole("button", { name: /Päijänteen kansallispuisto/i });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByTestId("focus-request")).toHaveTextContent("paijanne");
  });

  it("opens a mobile search panel from the header button", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    renderSearch();

    await userEvent.click(screen.getByRole("button", { name: "layout.parkSearch.label" }));

    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("filters in the mobile search field and closes on escape", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    renderSearch();

    await userEvent.click(screen.getByRole("button", { name: "layout.parkSearch.label" }));

    const mobileInput = screen.getByRole("searchbox");
    fireEvent.change(mobileInput, { target: { value: "xyz" } });

    await waitFor(() => {
      expect(screen.getByText("layout.parkSearch.empty")).toBeInTheDocument();
    });

    fireEvent.keyDown(mobileInput, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    });
  });

  it("closes the open result list when clicking outside the search container", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.focus(input);

    await screen.findByRole("button", { name: /Päijänteen kansallispuisto/i });

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /Päijänteen kansallispuisto/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("renders the desktop search icon with visible foreground contrast styling", () => {
    vi.mocked(apiFetch).mockImplementationOnce(() => new Promise(() => {}));

    const { container } = renderSearch();
    const icon = container.querySelector('svg[class*="text-foreground/60"]');
    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });

    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("z-10");
    expect(input).toHaveClass(
      "appearance-none",
      "[&::-webkit-search-decoration]:appearance-none",
      "[&::-webkit-search-results-decoration]:appearance-none",
    );
  });

  it("shows only the park type in the result meta line", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "päij" } });

    const result = await screen.findByRole("button", { name: /Päijänteen kansallispuisto/i });

    expect(result).toHaveTextContent("Kansallispuisto");
    expect(result).not.toHaveTextContent("Päijät-Häme");
  });

  it("offers a direct park-page link beside home map search results", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "päij" } });

    expect(
      await screen.findByRole("link", { name: "layout.parkSearch.openParkPage" }),
    ).toHaveAttribute("href", "/park/paijanne");
  });

  it("closes the result list when the direct park-page link is activated", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "päij" } });

    await userEvent.click(
      await screen.findByRole("link", { name: "layout.parkSearch.openParkPage" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: "layout.parkSearch.openParkPage" }),
      ).not.toBeInTheDocument();
    });
  });

  it("reads a park query parameter into the shared parks map focus state", async () => {
    searchParamsState.value = "park=teijo";
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    renderSearch();

    await waitFor(() => {
      expect(screen.getByTestId("focus-request")).toHaveTextContent("teijo");
    });
  });
});
