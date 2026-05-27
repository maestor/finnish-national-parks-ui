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
    location: "Päijät-Häme",
    logo: null,
    luontoonUrl: null,
    map: null,
    establishmentYear: 1993,
    boundingBox: { minLat: 61, minLon: 25, maxLat: 62, maxLon: 26 },
    markerPoint: { lat: 61.5, lon: 25.5 },
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
  },
  {
    slug: "teijo",
    name: "Teijon kansallispuisto",
    displayTypeName: "Maailmanperintökohde",
    areaKm2: 11,
    location: "Varsinais-Suomi",
    logo: null,
    luontoonUrl: null,
    map: null,
    establishmentYear: 2015,
    boundingBox: { minLat: 60, minLon: 22, maxLat: 61, maxLon: 23 },
    markerPoint: { lat: 60.5, lon: 22.5 },
    type: { code: 4, id: 4, name: "Muu luonnonsuojelualue", slug: "other-nature-reserve" },
  },
];

const mobileScrollableParks: Park[] = Array.from({ length: 12 }, (_, index) => ({
  slug: `park-${index + 1}`,
  name: `Kansallispuisto ${index + 1}`,
  areaKm2: index + 1,
  location: `Alue ${index + 1}`,
  logo: null,
  luontoonUrl: null,
  map: null,
  establishmentYear: 2000 + index,
  boundingBox: { minLat: 60 + index, minLon: 24, maxLat: 60.5 + index, maxLon: 24.5 },
  markerPoint: { lat: 60.25 + index, lon: 24.25 },
  type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
}));

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

  it("renders all matching results in the desktop scroll panel", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks: mobileScrollableParks });

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "Kansallispuisto" } });

    const resultsList = await screen.findByRole("list");

    expect(resultsList).toHaveClass("overflow-y-auto");
    expect(screen.getByRole("button", { name: /Kansallispuisto 12/i })).toBeInTheDocument();
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

  it("renders mobile results in a touch-scrollable list", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks: mobileScrollableParks });

    renderSearch();

    await userEvent.click(screen.getByRole("button", { name: "layout.parkSearch.label" }));

    const mobileInput = screen.getByRole("searchbox");
    fireEvent.change(mobileInput, { target: { value: "Kansallispuisto" } });

    const resultsList = await screen.findByRole("list");

    expect(resultsList).toHaveClass("overflow-y-auto");
    expect(resultsList).toHaveClass("overscroll-contain");
    expect(resultsList).toHaveClass("touch-pan-y");
    expect(screen.getByRole("button", { name: /Kansallispuisto 12/i })).toBeInTheDocument();
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

  it("shows the park display type override in the result meta line", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "teij" } });

    const result = await screen.findByRole("button", { name: /Teijon kansallispuisto/i });

    expect(result).toHaveTextContent("Maailmanperintökohde");
    expect(result).not.toHaveTextContent("Muu luonnonsuojelualue");
    expect(result).not.toHaveTextContent("Varsinais-Suomi");
  });

  it("matches parks by the custom display type name", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "maailmanperintö" } });

    expect(
      await screen.findByRole("button", { name: /Teijon kansallispuisto/i }),
    ).toBeInTheDocument();
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
