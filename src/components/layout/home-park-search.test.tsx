import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HomeMapControlsProvider,
  useHomeMapControls,
} from "@/components/providers/home-map-controls-provider";
import { apiFetch } from "@/lib/api";
import type { CombinedSearchIndex } from "@/lib/parks";
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
    prefetch: _prefetch,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
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

type SearchPark = CombinedSearchIndex["parks"][number];

const parks: SearchPark[] = [
  {
    slug: "paijanne",
    name: "Päijänteen kansallispuisto",
    address: "Päijänteentie 1, 17200 Päijät-Häme",
    locationLabel: "Päijänteentie 1",
    postalCode: "17200",
    postalOffice: "Päijät-Häme",
    trailNames: [],
    visited: true,
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
  },
  {
    slug: "teijo",
    name: "Teijon kansallispuisto",
    displayTypeName: "Maailmanperintökohde",
    visited: false,
    address: "Matildanjärventie 84, 25570 Salo",
    locationLabel: "Matildanjärventie 84",
    postalCode: "25570",
    postalOffice: "Salo",
    trailNames: [],
    type: { code: 4, id: 4, name: "Muu luonnonsuojelualue", slug: "nature-reserve-area" },
  },
];

const createSearchIndex = (searchParks: SearchPark[]): CombinedSearchIndex => ({
  parks: searchParks,
  trips: [],
});

const mobileScrollableParks: SearchPark[] = Array.from({ length: 12 }, (_, index) => ({
  slug: `park-${index + 1}`,
  name: `Kansallispuisto ${index + 1}`,
  address: `Katu ${index + 1}, 0010${index} Alue ${index + 1}`,
  locationLabel: `Katu ${index + 1}`,
  postalCode: `0010${index}`,
  postalOffice: `Alue ${index + 1}`,
  trailNames: [],
  visited: index % 2 === 0,
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
    vi.mocked(apiFetch).mockReset();
    pathnameState.value = "/parks";
    searchParamsState.value = "";
  });

  it("defers loading the park index until the search is first used", async () => {
    vi.mocked(apiFetch).mockResolvedValue(createSearchIndex(parks));

    renderSearch();

    expect(apiFetch).not.toHaveBeenCalled();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.focus(input);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/search", { cache: "no-store" });
    });
  });

  it("filters parks by query and activates the matching park on the parks map", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(parks));

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "päij" } });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Päijänteen kansallispuisto/i }),
      ).toBeInTheDocument();
    });

    expect(apiFetch).toHaveBeenCalledWith("/api/search", { cache: "no-store" });

    fireEvent.click(screen.getByRole("button", { name: /Päijänteen kansallispuisto/i }));

    expect(screen.getByTestId("focus-request")).toHaveTextContent("paijanne");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("finds and focuses a park by a partial, case-insensitive trail name", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      createSearchIndex([
        ...parks,
        {
          ...parks[0],
          slug: "nuuksion-kansallispuisto",
          name: "Nuuksion kansallispuisto",
          trailNames: ["Klassarinkierros"],
        },
      ]),
    );

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: " KLASSARIN " } });

    const park = await screen.findByRole("button", { name: /Nuuksion kansallispuisto/ });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.click(park);

    expect(screen.getByTestId("focus-request")).toHaveTextContent("nuuksion-kansallispuisto");
  });

  it("matches a trip by its visited place and sorts the two result tiers in Finnish order", async () => {
    const searchIndex: CombinedSearchIndex = {
      parks: parks.map((park) =>
        park.slug === "paijanne"
          ? { ...park, name: "Nuuksion kansallispuisto", slug: "nuuksio", visited: true }
          : { ...park, name: "Aulangon puisto", slug: "aulanko", visited: false },
      ),
      trips: [
        { name: "Syysretki", slug: "syysretki", stopNames: [], visitedParkSlugs: ["nuuksio"] },
        { name: "Evon retki", slug: "evon-retki", stopNames: [], visitedParkSlugs: ["nuuksio"] },
      ],
    };
    vi.mocked(apiFetch).mockResolvedValueOnce(searchIndex);

    renderSearch();

    fireEvent.focus(screen.getByRole("combobox", { name: "layout.parkSearch.label" }));

    const rows = await screen.findAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Evon retki"),
      expect.stringContaining("Nuuksion kansallispuisto"),
      expect.stringContaining("Syysretki"),
      expect.stringContaining("Aulangon puisto"),
    ]);

    fireEvent.change(screen.getByRole("combobox", { name: "layout.parkSearch.label" }), {
      target: { value: "nuuksio" },
    });
    expect(await screen.findByRole("link", { name: /Syysretki/ })).toHaveAttribute(
      "href",
      "/retki/syysretki",
    );
    expect(screen.getByRole("button", { name: /Nuuksion kansallispuisto/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Syysretki/ })).toHaveLength(1);
  });

  it("matches a trip by a stop name without duplicating the trip result", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ...createSearchIndex(parks),
      trips: [
        {
          name: "Syysretki",
          slug: "syysretki",
          stopNames: ["Laavun tauko", "Syysretki näköalapaikka"],
          visitedParkSlugs: [],
        },
      ],
    });

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "laavun tauko" } });

    const tripLink = await screen.findByRole("link", { name: /Syysretki/ });
    expect(tripLink).toHaveAttribute("href", "/retki/syysretki");

    fireEvent.change(input, { target: { value: "syysretki" } });
    expect(await screen.findAllByRole("link", { name: /Syysretki/ })).toHaveLength(1);
  });

  it("opens trip results by keyboard from the map and another route", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ...createSearchIndex(parks),
      trips: [
        { name: "Syysretki", slug: "syysretki", stopNames: [], visitedParkSlugs: ["paijanne"] },
      ],
    });

    const { unmount } = renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "syys" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    await screen.findByRole("link", { name: /Syysretki/ });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/retki/syysretki");

    mockPush.mockReset();
    pathnameState.value = "/retket";
    unmount();
    renderSearch();
    const otherRouteInput = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.focus(otherRouteInput);
    fireEvent.change(otherRouteInput, { target: { value: "syys" } });
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    fireEvent.keyDown(otherRouteInput, { key: "ArrowDown" });
    fireEvent.keyDown(otherRouteInput, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/retki/syysretki");
  });

  it("fetches once while typing, then refreshes after the search is reopened", async () => {
    vi.mocked(apiFetch).mockResolvedValue(createSearchIndex(parks));

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "p" } });
    fireEvent.change(input, { target: { value: "päij" } });
    await screen.findByRole("button", { name: /Päijänteen kansallispuisto/ });
    expect(apiFetch).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(document.body);
    fireEvent.focus(input);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(apiFetch).toHaveBeenLastCalledWith("/api/search", { cache: "no-store" });
  });

  it("navigates to a park page when search is used outside the parks map page", async () => {
    pathnameState.value = "/park/pallas";
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(parks));

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "päij" } });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Päijänteen kansallispuisto/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Päijänteen kansallispuisto/i }));

    expect(mockPush).toHaveBeenCalledWith("/paikka/paijanne");
  });

  it("shows an empty state when no parks match the query", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(parks));

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "xyz" } });

    await waitFor(() => {
      expect(screen.getByText("layout.parkSearch.empty")).toBeInTheDocument();
    });
  });

  it("matches a park by its address", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(parks));

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "25570" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Teijon kansallispuisto/i })).toBeInTheDocument();
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

  it("retries a failed index read after the search is closed and reopened", async () => {
    vi.mocked(apiFetch)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(createSearchIndex(parks));

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.focus(input);
    await screen.findByText("layout.parkSearch.empty");
    fireEvent.mouseDown(document.body);
    fireEvent.focus(input);

    expect(await screen.findByRole("button", { name: /Päijänteen kansallispuisto/ })).toBeVisible();
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it("supports keyboard navigation from the desktop search field", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(parks));

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });

    fireEvent.focus(input);
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
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(parks));

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    await screen.findByRole("button", { name: /Päijänteen kansallispuisto/i });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByTestId("focus-request")).toHaveTextContent("paijanne");
  });

  it("renders all matching results in the desktop scroll panel", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(mobileScrollableParks));

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "Kansallispuisto" } });

    const resultsList = await screen.findByRole("list");

    expect(resultsList).toHaveClass("overflow-y-auto");
    expect(screen.getByRole("button", { name: /Kansallispuisto 12/i })).toBeInTheDocument();
  });

  it("opens a mobile search panel from the header button", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(parks));

    renderSearch();

    await userEvent.click(screen.getByRole("button", { name: "layout.parkSearch.label" }));

    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("filters in the mobile search field and closes on escape", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(parks));

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
    expect(screen.getByRole("button", { name: "layout.parkSearch.label" })).toHaveFocus();
  });

  it("renders mobile results in a touch-scrollable list", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(mobileScrollableParks));

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
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(parks));

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
    const { container } = renderSearch();
    const icon = container.querySelector('svg[class*="text-icon"]');
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
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(parks));

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "teij" } });

    const result = await screen.findByRole("button", { name: /Teijon kansallispuisto/i });

    expect(result).toHaveTextContent("Maailmanperintökohde");
    expect(result).not.toHaveTextContent("Muu luonnonsuojelualue");
    expect(result).not.toHaveTextContent("Varsinais-Suomi");
  });

  it("matches parks by the custom display type name", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(parks));

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "maailmanperintö" } });

    expect(
      await screen.findByRole("button", { name: /Teijon kansallispuisto/i }),
    ).toBeInTheDocument();
  });

  it("offers a direct park-page link beside home map search results", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(parks));

    renderSearch();

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    fireEvent.change(input, { target: { value: "päij" } });

    expect(
      await screen.findByRole("link", { name: "layout.parkSearch.openParkPage" }),
    ).toHaveAttribute("href", "/paikka/paijanne");
  });

  it("closes the result list when the direct park-page link is activated", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(parks));

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
    vi.mocked(apiFetch).mockResolvedValueOnce(createSearchIndex(parks));

    renderSearch();

    await waitFor(() => {
      expect(screen.getByTestId("focus-request")).toHaveTextContent("teijo");
    });
  });
});
