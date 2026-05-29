import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ParkManagement } from "./park-management";

vi.mock("./park-list", () => ({
  ParkList: () => <div data-testid="park-list">ParkList</div>,
}));

vi.mock("./admin-park-map", () => ({
  AdminParkMap: () => <div data-testid="admin-park-map">AdminParkMap</div>,
}));

const basePark = {
  slug: "pallas",
  name: "Pallas-Yllästunturin kansallispuisto",
  areaKm2: 1020,
  location: "Lappi",
  logo: null,
  luontoonUrl: null,
  map: null,
  establishmentYear: 1938,
  boundingBox: { minLat: 67, minLon: 23, maxLat: 68, maxLon: 24 },
  markerPoint: { lat: 67.5, lon: 23.5 },
  type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" as const },
};

describe("ParkManagement", () => {
  it("renders list view by default", () => {
    render(<ParkManagement parks={[basePark]} removedParks={[]} />);

    expect(screen.getByTestId("park-list")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-park-map")).not.toBeInTheDocument();
  });

  it("switches to map view when map tab is clicked", async () => {
    const user = userEvent.setup();
    render(<ParkManagement parks={[basePark]} removedParks={[]} />);

    const mapTab = screen.getByRole("tab", { name: "controlPanel.parks.viewTabs.map" });
    await user.click(mapTab);

    expect(screen.getByTestId("admin-park-map")).toBeInTheDocument();
    expect(screen.queryByTestId("park-list")).not.toBeInTheDocument();
  });

  it("switches back to list view when list tab is clicked", async () => {
    const user = userEvent.setup();
    render(<ParkManagement parks={[basePark]} removedParks={[]} />);

    const mapTab = screen.getByRole("tab", { name: "controlPanel.parks.viewTabs.map" });
    await user.click(mapTab);

    const listTab = screen.getByRole("tab", { name: "controlPanel.parks.viewTabs.list" });
    await user.click(listTab);

    expect(screen.getByTestId("park-list")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-park-map")).not.toBeInTheDocument();
  });

  it("sets correct aria-selected on tabs", async () => {
    const user = userEvent.setup();
    render(<ParkManagement parks={[basePark]} removedParks={[]} />);

    const listTab = screen.getByRole("tab", { name: "controlPanel.parks.viewTabs.list" });
    const mapTab = screen.getByRole("tab", { name: "controlPanel.parks.viewTabs.map" });

    expect(listTab).toHaveAttribute("aria-selected", "true");
    expect(mapTab).toHaveAttribute("aria-selected", "false");

    await user.click(mapTab);

    expect(listTab).toHaveAttribute("aria-selected", "false");
    expect(mapTab).toHaveAttribute("aria-selected", "true");
  });
});
