import { apiFetch } from "@/lib/api";
import type { Park } from "@/lib/parks";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ParkList } from "./park-list";

const mockRefresh = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
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

describe("ParkList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });

  it("renders parks sorted by name with links to the public park pages", () => {
    render(<ParkList parks={parks} />);

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

    render(<ParkList parks={parks} />);

    fireEvent.click(screen.getAllByRole("button", { name: "controlPanel.parks.removeAction" })[0]);

    expect(window.confirm).toHaveBeenCalledWith("controlPanel.parks.confirmRemove");

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/parks/aulanko/removed", {
        method: "PATCH",
        body: JSON.stringify({ removed: true }),
      });
    });

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

    render(<ParkList parks={parks} />);

    fireEvent.click(screen.getAllByRole("button", { name: "controlPanel.parks.removeAction" })[0]);

    expect(apiFetch).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("shows an error when park removal fails", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("remove failed"));

    render(<ParkList parks={parks} />);

    fireEvent.click(screen.getAllByRole("button", { name: "controlPanel.parks.removeAction" })[0]);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("remove failed");
    });

    expect(mockRefresh).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Aulangon luonnonsuojelualue" })).toBeInTheDocument();
  });

  it("shows an empty state when there are no parks to manage", () => {
    render(<ParkList parks={[]} />);

    expect(screen.getByText("controlPanel.parks.empty")).toBeInTheDocument();
  });
});
