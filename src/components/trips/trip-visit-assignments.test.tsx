import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VisitWithPark } from "@/lib/parks";
import type { Trip } from "@/lib/trips";
import { TripVisitAssignments } from "./trip-visit-assignments";

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

const currentTrip = {
  id: 7,
  name: "Keski-Suomen kesaretki",
  description: "Kolmen paivan kierros kansallispuistoihin.",
  visitCount: 1,
  dateRange: {
    start: "2024-06-15",
    end: "2024-06-15",
  },
  createdAt: "2024-06-18T00:00:00Z",
  updatedAt: "2024-06-18T00:00:00Z",
} satisfies Trip;

const visits = [
  {
    id: 10,
    park: {
      slug: "pallas",
      name: "Pallas-Yllästunturi",
    },
    trip: null,
    visitedOn: "2024-06-15",
    route: "Huippupolku",
    author: "Maija",
    note: null,
    createdAt: "2024-06-15T00:00:00Z",
    updatedAt: "2024-06-15T00:00:00Z",
    images: [],
  },
  {
    id: 11,
    park: {
      slug: "nuuksio",
      name: "Nuuksio",
    },
    trip: {
      id: currentTrip.id,
      name: currentTrip.name,
    },
    visitedOn: "2024-06-14",
    route: null,
    author: null,
    note: null,
    createdAt: "2024-06-14T00:00:00Z",
    updatedAt: "2024-06-14T00:00:00Z",
    images: [],
  },
  {
    id: 12,
    park: {
      slug: "repovesi",
      name: "Repovesi",
    },
    trip: {
      id: 8,
      name: "Syysloman rengasreitti",
    },
    visitedOn: "2024-06-13",
    route: "Korpinkierros",
    author: null,
    note: null,
    createdAt: "2024-06-13T00:00:00Z",
    updatedAt: "2024-06-13T00:00:00Z",
    images: [],
  },
] satisfies VisitWithPark[];

describe("TripVisitAssignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows assigned visits and defaults available visits to unassigned ones", () => {
    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const assignedSection = screen.getByRole("heading", {
      name: "controlPanel.trips.assignments.assignedTitle",
    }).parentElement?.parentElement;
    const availableSection = screen.getByRole("heading", {
      name: "controlPanel.trips.assignments.availableTitle",
    }).parentElement?.parentElement;

    if (!(assignedSection instanceof HTMLElement) || !(availableSection instanceof HTMLElement)) {
      throw new Error("Expected trip visit sections");
    }

    expect(within(assignedSection).getByText("Nuuksio")).toBeInTheDocument();
    expect(within(availableSection).getByText("Pallas-Yllästunturi")).toBeInTheDocument();
    expect(within(availableSection).queryByText("Repovesi")).not.toBeInTheDocument();
  });

  it("attaches an unassigned visit to the current trip", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const availableSection = screen.getByRole("heading", {
      name: "controlPanel.trips.assignments.availableTitle",
    }).parentElement?.parentElement;

    if (!(availableSection instanceof HTMLElement)) {
      throw new Error("Expected available visits section");
    }

    const pallasRow = within(availableSection).getByText("Pallas-Yllästunturi").closest("tr");

    if (!(pallasRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected Pallas visit row");
    }

    await userEvent.click(
      within(pallasRow).getByRole("button", {
        name: "controlPanel.trips.assignments.attachAction",
      }),
    );

    expect(apiFetch).toHaveBeenCalledWith("/api/visits/10", {
      method: "PATCH",
      body: JSON.stringify({
        tripId: 7,
      }),
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "pallas" });
    expect(screen.getAllByText("Pallas-Yllästunturi").length).toBeGreaterThan(1);
  });

  it("keeps visits from other trips out of the available list", () => {
    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const availableSection = screen.getByRole("heading", {
      name: "controlPanel.trips.assignments.availableTitle",
    }).parentElement?.parentElement;

    if (!(availableSection instanceof HTMLElement)) {
      throw new Error("Expected available visits section");
    }

    expect(within(availableSection).queryByText("Repovesi")).not.toBeInTheDocument();
  });

  it("removes a visit from the current trip", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const assignedSection = screen.getByRole("heading", {
      name: "controlPanel.trips.assignments.assignedTitle",
    }).parentElement?.parentElement;

    if (!(assignedSection instanceof HTMLElement)) {
      throw new Error("Expected assigned visits section");
    }

    const nuuksioRow = within(assignedSection).getByText("Nuuksio").closest("tr");

    if (!(nuuksioRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected Nuuksio visit row");
    }

    await userEvent.click(
      within(nuuksioRow).getByRole("button", {
        name: "controlPanel.trips.assignments.removeAction",
      }),
    );

    expect(apiFetch).toHaveBeenCalledWith("/api/visits/11", {
      method: "PATCH",
      body: JSON.stringify({
        tripId: null,
      }),
    });
    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "nuuksio" });
  });
});
