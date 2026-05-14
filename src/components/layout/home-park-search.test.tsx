import { apiFetch } from "@/lib/api";
import type { Park } from "@/lib/parks";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HomeParkSearch } from "./home-park-search";

const mockPush = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
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

describe("HomeParkSearch", () => {
  it("filters parks by query and navigates to a park page", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    render(<HomeParkSearch />);

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    await userEvent.type(input, "päij");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Päijänteen kansallispuisto/i }),
      ).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /Päijänteen kansallispuisto/i }));

    expect(mockPush).toHaveBeenCalledWith("/park/paijanne");
  });

  it("shows an empty state when no parks match the query", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks });

    render(<HomeParkSearch />);

    const input = screen.getByRole("combobox", { name: "layout.parkSearch.label" });
    await userEvent.type(input, "xyz");

    await waitFor(() => {
      expect(screen.getByText("layout.parkSearch.empty")).toBeInTheDocument();
    });
  });
});
