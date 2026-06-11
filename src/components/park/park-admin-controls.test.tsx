import { apiFetch } from "@/lib/api";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ParkAdminControlsProvider,
  ParkAdminSection,
  ParkVisibilityBadge,
} from "./park-admin-controls";

const mockUseAuth = vi.fn();
const { mockRevalidatePublicCache } = vi.hoisted(() => ({
  mockRevalidatePublicCache: vi.fn(async () => true),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/public-cache", () => ({
  revalidatePublicCache: mockRevalidatePublicCache,
}));

const renderControls = (children: ReactNode) =>
  render(<ParkAdminControlsProvider parkSlug="pallas">{children}</ParkAdminControlsProvider>);

const createVisibilityPark = () => ({
  slug: "pallas",
  name: "Pallas",
  address: "Pallasjärventie 14, 99300 Muonio",
  locationLabel: "Pallasjärventie 14",
  boundingBox: { minLat: 67, minLon: 23, maxLat: 68, maxLon: 24 },
  markerPoint: { lat: 67.5, lon: 23.5 },
  postalCode: "99300",
  postalOffice: "Muonio",
  type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
});

describe("Park admin controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stays hidden for logged out visitors", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    });

    renderControls(
      <>
        <ParkVisibilityBadge />
        <ParkAdminSection />
      </>,
    );

    expect(screen.queryByText("park.admin.visibleBadge")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "park.admin.title" })).not.toBeInTheDocument();
  });

  it("shows the current visibility badge and admin actions for authenticated users", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    vi.mocked(apiFetch).mockResolvedValueOnce({
      visibleParks: [createVisibilityPark()],
      removedParks: [],
    });

    renderControls(
      <>
        <ParkVisibilityBadge />
        <ParkAdminSection />
      </>,
    );

    expect(await screen.findAllByText("park.admin.visibleBadge")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "park.admin.title" })).toBeInTheDocument();
    const editLink = screen.getByRole("link", { name: "park.admin.editAction" });
    const hideButton = screen.getByRole("button", { name: "park.admin.hideAction" });

    expect(editLink).toHaveAttribute("href", "/control-panel/parks/pallas/edit");
    expect(editLink).toHaveClass("bg-primary", "text-primary-foreground");
    expect(editLink.parentElement?.firstElementChild).toBe(editLink);
    expect(editLink.parentElement?.children[1]).toBe(hideButton);
  });

  it("toggles park visibility from the admin section", async () => {
    const user = userEvent.setup();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        visibleParks: [createVisibilityPark()],
        removedParks: [],
      })
      .mockResolvedValueOnce(undefined);

    renderControls(<ParkAdminSection />);

    await user.click(await screen.findByRole("button", { name: "park.admin.hideAction" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/parks/pallas/removed", {
        method: "PATCH",
        body: JSON.stringify({ removed: true }),
      });
    });

    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "pallas" });
    expect(await screen.findByText("park.admin.hiddenBadge")).toBeInTheDocument();
  });

  it("shows hidden-state actions for authenticated admins viewing a removed park", async () => {
    const user = userEvent.setup();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        visibleParks: [],
        removedParks: [createVisibilityPark()],
      })
      .mockResolvedValueOnce(undefined);

    renderControls(<ParkAdminSection />);

    expect(await screen.findByText("park.admin.hiddenBadge")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "park.admin.showAction" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "park.admin.showAction" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/parks/pallas/removed", {
        method: "PATCH",
        body: JSON.stringify({ removed: false }),
      });
    });

    expect(await screen.findByText("park.admin.visibleBadge")).toBeInTheDocument();
  });

  it("stays hidden when the admin visibility lookup does not include the current park", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    vi.mocked(apiFetch).mockResolvedValueOnce({
      visibleParks: [{ ...createVisibilityPark(), slug: "other-park" }],
      removedParks: [],
    });

    renderControls(<ParkAdminSection />);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/admin/parks/visibility");
    });
    expect(screen.queryByRole("heading", { name: "park.admin.title" })).not.toBeInTheDocument();
  });

  it("shows an error when toggling visibility fails", async () => {
    const user = userEvent.setup();

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    });
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        visibleParks: [createVisibilityPark()],
        removedParks: [],
      })
      .mockRejectedValueOnce(new Error("toggle failed"));

    renderControls(<ParkAdminSection />);

    await user.click(await screen.findByRole("button", { name: "park.admin.hideAction" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("toggle failed");
    expect(screen.getByRole("button", { name: "park.admin.hideAction" })).toBeInTheDocument();
  });
});
