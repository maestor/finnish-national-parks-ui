import { apiFetch } from "@/lib/api";
import type { Park } from "@/lib/parks";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParkList } from "./park-list";

const mockRefresh = vi.fn();
const { mockRevalidatePublicCache } = vi.hoisted(() => ({
  mockRevalidatePublicCache: vi.fn(async () => true),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/public-cache", () => ({
  revalidatePublicCache: mockRevalidatePublicCache,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const parks: Park[] = [
  {
    slug: "teijo",
    name: "Teijon kansallispuisto",
    areaKm2: 50,
    locationLabel: "Salo",
    luontoonUrl: null,
    establishmentYear: 2015,
    boundingBox: { minLat: 60, minLon: 22, maxLat: 61, maxLon: 23 },
    markerPoint: { lat: 60.2, lon: 22.9 },
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
  },
  {
    slug: "aulanko",
    name: "Aulangon luonnonsuojelualue",
    areaKm2: 12,
    locationLabel: "Hameenlinna",
    luontoonUrl: null,
    establishmentYear: null,
    boundingBox: { minLat: 61, minLon: 24, maxLat: 62, maxLon: 25 },
    markerPoint: { lat: 61.1, lon: 24.5 },
    type: { code: 4, id: 4, name: "Muu luonnonsuojelualue", slug: "other-nature-reserve" },
  },
];

const removedParks: Park[] = [
  {
    slug: "repovesi",
    name: "Repoveden kansallispuisto",
    areaKm2: 15,
    locationLabel: "Kouvola",
    luontoonUrl: null,
    establishmentYear: 2003,
    boundingBox: { minLat: 61, minLon: 26, maxLat: 62, maxLon: 27 },
    markerPoint: { lat: 61.3, lon: 26.5 },
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
  },
];

describe("ParkList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });

  it("renders parks sorted by name with links to the public park pages", () => {
    render(<ParkList parks={parks} removedParks={removedParks} />);

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Aulangon luonnonsuojelualue" })).toHaveAttribute(
      "href",
      "/park/aulanko",
    );
    expect(screen.getByRole("link", { name: "Teijon kansallispuisto" })).toHaveAttribute(
      "href",
      "/park/teijo",
    );
  });

  it("removes a park after confirmation and refreshes the route", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<ParkList parks={parks} removedParks={removedParks} />);

    fireEvent.click(screen.getAllByRole("button", { name: "controlPanel.parks.removeAction" })[0]);

    expect(window.confirm).toHaveBeenCalledWith("controlPanel.parks.confirmRemove");

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/parks/aulanko/removed", {
        method: "PATCH",
        body: JSON.stringify({ removed: true }),
      });
    });

    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "aulanko" });
    expect(mockRefresh).toHaveBeenCalled();
    expect(
      screen.queryByRole("link", { name: "Aulangon luonnonsuojelualue" }),
    ).not.toBeInTheDocument();
  });

  it("does not call the API when park removal is cancelled", () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );

    render(<ParkList parks={parks} removedParks={removedParks} />);

    fireEvent.click(screen.getAllByRole("button", { name: "controlPanel.parks.removeAction" })[0]);

    expect(apiFetch).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("shows an error when park removal fails", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("remove failed"));

    render(<ParkList parks={parks} removedParks={removedParks} />);

    fireEvent.click(screen.getAllByRole("button", { name: "controlPanel.parks.removeAction" })[0]);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("remove failed");
    });

    expect(mockRefresh).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Aulangon luonnonsuojelualue" })).toBeInTheDocument();
  });

  it("shows removed parks on the hidden tab and restores them", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<ParkList parks={parks} removedParks={removedParks} />);

    fireEvent.click(screen.getByRole("tab", { name: "controlPanel.parks.tabs.hidden" }));
    fireEvent.click(screen.getByRole("button", { name: "controlPanel.parks.restoreAction" }));

    expect(window.confirm).toHaveBeenCalledWith("controlPanel.parks.confirmRestore");

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/parks/repovesi/removed", {
        method: "PATCH",
        body: JSON.stringify({ removed: false }),
      });
    });

    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "repovesi" });
    expect(mockRefresh).toHaveBeenCalled();
    expect(
      screen.queryByRole("link", { name: "Repoveden kansallispuisto" }),
    ).not.toBeInTheDocument();
  });

  it("filters parks by search query and type", async () => {
    const user = userEvent.setup();

    render(<ParkList parks={parks} removedParks={removedParks} />);

    await user.type(screen.getByLabelText("controlPanel.parks.filters.searchLabel"), "Teijo");

    expect(screen.getByRole("link", { name: "Teijon kansallispuisto" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Aulangon luonnonsuojelualue" }),
    ).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("controlPanel.parks.filters.searchLabel"));
    await user.selectOptions(
      screen.getByLabelText("controlPanel.parks.filters.typeLabel"),
      "other-nature-reserve",
    );

    expect(screen.getByRole("link", { name: "Aulangon luonnonsuojelualue" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Teijon kansallispuisto" })).not.toBeInTheDocument();
  });

  it("shows filtered empty state and resets the filters", async () => {
    const user = userEvent.setup();

    render(<ParkList parks={parks} removedParks={removedParks} />);

    await user.type(screen.getByLabelText("controlPanel.parks.filters.searchLabel"), "Lemmenjoki");

    expect(screen.getByText("controlPanel.parks.emptyFiltered")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "controlPanel.parks.filters.reset" }));

    expect(screen.queryByText("controlPanel.parks.emptyFiltered")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Teijon kansallispuisto" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aulangon luonnonsuojelualue" })).toBeInTheDocument();
  });

  it("shows an empty state when there are no parks in the active tab", () => {
    render(<ParkList parks={[]} removedParks={removedParks} />);

    expect(screen.getByText("controlPanel.parks.emptyVisible")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "controlPanel.parks.tabs.hidden" }));

    expect(screen.getByRole("link", { name: "Repoveden kansallispuisto" })).toBeInTheDocument();
  });

  it("shows an empty state when there are no parks to manage at all", () => {
    render(<ParkList parks={[]} removedParks={[]} />);

    expect(screen.getByText("controlPanel.parks.emptyAll")).toBeInTheDocument();
  });
});
