import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Trip } from "@/lib/trips";
import { TripManagement } from "./trip-management";

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

const trips = [
  {
    id: 7,
    name: "Keski-Suomen kesaretki",
    slug: "keski-suomen-kesaretki",
    description: "Kolmen paivan kierros kansallispuistoihin.",
    startingPoint: null,
    visitCount: 2,
    dateRange: {
      start: "2024-06-15",
      end: "2024-06-17",
    },
    createdAt: "2024-06-18T00:00:00Z",
    updatedAt: "2024-06-18T00:00:00Z",
  },
  {
    id: 8,
    name: "Syysloman rengasreitti",
    slug: "syysloman-rengasreitti",
    description: null,
    startingPoint: {
      coordinate: { lat: 61.9241, lon: 25.7482 },
      label: "Jyvaskyla",
    },
    visitCount: 1,
    dateRange: {
      start: "2023-10-10",
      end: "2023-10-10",
    },
    createdAt: "2023-10-11T00:00:00Z",
    updatedAt: "2023-10-11T00:00:00Z",
  },
] satisfies Trip[];

describe("TripManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });

  it("renders the trip table and quick add links", () => {
    render(<TripManagement trips={trips} />);

    expect(screen.getByText("Keski-Suomen kesaretki")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "controlPanel.trips.list.addVisit" })[0],
    ).toHaveAttribute("href", "/hallinta/kaynnit/uusi?trip=7");
  });

  it("filters trips by query", async () => {
    render(<TripManagement trips={trips} />);

    await userEvent.type(
      screen.getByLabelText("controlPanel.trips.list.filters.searchLabel"),
      "syys",
    );

    expect(screen.queryByText("Keski-Suomen kesaretki")).not.toBeInTheDocument();
    expect(screen.getByText("Syysloman rengasreitti")).toBeInTheDocument();
  });

  it("deletes a trip and refreshes the page", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<TripManagement trips={trips} />);

    await userEvent.click(
      screen.getAllByRole("button", { name: "controlPanel.trips.list.delete" })[0],
    );

    expect(apiFetch).toHaveBeenCalledWith("/api/trips/7", { method: "DELETE" });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
    expect(mockRevalidatePublicCache).toHaveBeenCalled();
  });
});
