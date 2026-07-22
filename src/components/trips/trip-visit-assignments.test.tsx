import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  visitCount: 2,
  dateRange: {
    start: "2024-06-14",
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
    tripStopOrder: null,
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
    tripStopOrder: 1,
    updatedAt: "2024-06-14T00:00:00Z",
    images: [],
  },
  {
    id: 13,
    park: {
      slug: "sipoo",
      name: "Sipoonkorpi",
    },
    trip: {
      id: currentTrip.id,
      name: currentTrip.name,
    },
    visitedOn: "2024-06-14",
    route: "Byabacken",
    author: null,
    note: null,
    createdAt: "2024-06-14T12:00:00Z",
    tripStopOrder: 2,
    updatedAt: "2024-06-14T12:00:00Z",
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
    tripStopOrder: 1,
    updatedAt: "2024-06-13T00:00:00Z",
    images: [],
  },
] satisfies VisitWithPark[];

const getAssignedVisitOrder = (section: HTMLElement) =>
  Array.from(section.querySelectorAll("[data-assigned-visit-id]")).map((row) =>
    row.getAttribute("data-assigned-visit-id"),
  );

const mockElementFromPoint = (element: Element) => {
  const elementFromPoint = vi.fn(() => element);

  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: elementFromPoint,
  });

  return elementFromPoint;
};

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
    expect(within(assignedSection).getByText("Sipoonkorpi")).toBeInTheDocument();
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
        tripStopOrder: 3,
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

  it("does not filter the assigned list when using the available-visits filters", async () => {
    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    await userEvent.type(
      screen.getByLabelText("controlPanel.trips.assignments.filters.searchLabel"),
      "Pallas",
    );

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
    expect(within(assignedSection).getByText("Sipoonkorpi")).toBeInTheDocument();
    expect(within(availableSection).getByText("Pallas-Yllästunturi")).toBeInTheDocument();
  });

  it("resets the available-visits filters", async () => {
    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const availableSection = screen.getByRole("heading", {
      name: "controlPanel.trips.assignments.availableTitle",
    }).parentElement?.parentElement;

    if (!(availableSection instanceof HTMLElement)) {
      throw new Error("Expected available visits section");
    }

    await userEvent.type(
      screen.getByLabelText("controlPanel.trips.assignments.filters.searchLabel"),
      "does-not-match",
    );

    expect(screen.getByText("controlPanel.trips.assignments.availableEmpty")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.filters.reset",
      }),
    );

    expect(
      screen.queryByText("controlPanel.trips.assignments.availableEmpty"),
    ).not.toBeInTheDocument();
    expect(within(availableSection).getByText("Pallas-Yllästunturi")).toBeInTheDocument();
  });

  it("reorders assigned visits with drag and drop and saves the moved stop order", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const assignedSection = screen.getByRole("heading", {
      name: "controlPanel.trips.assignments.assignedTitle",
    }).parentElement?.parentElement;

    if (!(assignedSection instanceof HTMLElement)) {
      throw new Error("Expected assigned visits section");
    }

    const sipoonkorpiRow = within(assignedSection).getByText("Sipoonkorpi").closest("tr");

    if (!(sipoonkorpiRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected Sipoonkorpi visit row");
    }

    mockElementFromPoint(sipoonkorpiRow);

    const reorderButtons = within(assignedSection).getAllByRole("button", {
      name: "controlPanel.trips.assignments.table.reorderVisit",
    });

    expect(getAssignedVisitOrder(assignedSection)).toEqual(["11", "13"]);

    await user.pointer([
      { target: reorderButtons[0], keys: "[MouseLeft>]", coords: { x: 10, y: 10 } },
      { target: reorderButtons[0], coords: { x: 22, y: 20 } },
    ]);

    await waitFor(() => {
      expect(getAssignedVisitOrder(assignedSection)).toEqual(["13", "11"]);
    });

    await user.pointer([{ target: reorderButtons[0], keys: "[/MouseLeft]" }]);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenNthCalledWith(1, "/api/visits/13", {
        method: "PATCH",
        body: JSON.stringify({
          tripId: 7,
          tripStopOrder: 1,
        }),
      });
      expect(apiFetch).toHaveBeenNthCalledWith(2, "/api/visits/11", {
        method: "PATCH",
        body: JSON.stringify({
          tripId: 7,
          tripStopOrder: 2,
        }),
      });
    });

    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "sipoo" });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("reorders assigned visits with the keyboard", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValue(undefined);

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const assignedSection = screen.getByRole("heading", {
      name: "controlPanel.trips.assignments.assignedTitle",
    }).parentElement?.parentElement;

    if (!(assignedSection instanceof HTMLElement)) {
      throw new Error("Expected assigned visits section");
    }

    const reorderButtons = within(assignedSection).getAllByRole("button", {
      name: "controlPanel.trips.assignments.table.reorderVisit",
    });

    reorderButtons[0]?.focus();
    await userEvent.keyboard("{ArrowRight}");

    await waitFor(() => {
      expect(getAssignedVisitOrder(assignedSection)).toEqual(["13", "11"]);
      expect(apiFetch).toHaveBeenCalledTimes(2);
    });
  });

  it("reorders assigned visits upward with the left arrow key", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValue(undefined);

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const assignedSection = screen.getByRole("heading", {
      name: "controlPanel.trips.assignments.assignedTitle",
    }).parentElement?.parentElement;

    if (!(assignedSection instanceof HTMLElement)) {
      throw new Error("Expected assigned visits section");
    }

    const reorderButtons = within(assignedSection).getAllByRole("button", {
      name: "controlPanel.trips.assignments.table.reorderVisit",
    });

    reorderButtons[1]?.focus();
    await userEvent.keyboard("{ArrowLeft}");

    await waitFor(() => {
      expect(getAssignedVisitOrder(assignedSection)).toEqual(["13", "11"]);
      expect(apiFetch).toHaveBeenCalledTimes(2);
    });
  });

  it("does not reorder past the start of the assigned list", async () => {
    const { apiFetch } = await import("@/lib/api");

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const assignedSection = screen.getByRole("heading", {
      name: "controlPanel.trips.assignments.assignedTitle",
    }).parentElement?.parentElement;

    if (!(assignedSection instanceof HTMLElement)) {
      throw new Error("Expected assigned visits section");
    }

    const reorderButtons = within(assignedSection).getAllByRole("button", {
      name: "controlPanel.trips.assignments.table.reorderVisit",
    });

    reorderButtons[0]?.focus();
    await userEvent.keyboard("{ArrowLeft}");

    expect(getAssignedVisitOrder(assignedSection)).toEqual(["11", "13"]);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("does not save when drag starts but the order does not change", async () => {
    const { apiFetch } = await import("@/lib/api");
    const user = userEvent.setup();

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const assignedSection = screen.getByRole("heading", {
      name: "controlPanel.trips.assignments.assignedTitle",
    }).parentElement?.parentElement;

    if (!(assignedSection instanceof HTMLElement)) {
      throw new Error("Expected assigned visits section");
    }

    const reorderButtons = within(assignedSection).getAllByRole("button", {
      name: "controlPanel.trips.assignments.table.reorderVisit",
    });

    await user.pointer([{ target: reorderButtons[0], keys: "[MouseLeft>]" }]);
    await user.pointer([{ target: reorderButtons[0], keys: "[/MouseLeft]" }]);

    expect(apiFetch).not.toHaveBeenCalled();
    expect(getAssignedVisitOrder(assignedSection)).toEqual(["11", "13"]);
  });

  it("restores the previous order when a drag is canceled", async () => {
    const { apiFetch } = await import("@/lib/api");

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const assignedSection = screen.getByRole("heading", {
      name: "controlPanel.trips.assignments.assignedTitle",
    }).parentElement?.parentElement;

    if (!(assignedSection instanceof HTMLElement)) {
      throw new Error("Expected assigned visits section");
    }

    const sipoonkorpiRow = within(assignedSection).getByText("Sipoonkorpi").closest("tr");

    if (!(sipoonkorpiRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected Sipoonkorpi visit row");
    }

    mockElementFromPoint(sipoonkorpiRow);

    const reorderButtons = within(assignedSection).getAllByRole("button", {
      name: "controlPanel.trips.assignments.table.reorderVisit",
    });

    fireEvent.pointerDown(reorderButtons[0], { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 24, clientY: 24 });

    await waitFor(() => {
      expect(getAssignedVisitOrder(assignedSection)).toEqual(["13", "11"]);
    });

    fireEvent.pointerCancel(window, { pointerId: 1 });

    await waitFor(() => {
      expect(getAssignedVisitOrder(assignedSection)).toEqual(["11", "13"]);
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("restores the previous order when saving a reorder fails", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("save failed"));
    const user = userEvent.setup();

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const assignedSection = screen.getByRole("heading", {
      name: "controlPanel.trips.assignments.assignedTitle",
    }).parentElement?.parentElement;

    if (!(assignedSection instanceof HTMLElement)) {
      throw new Error("Expected assigned visits section");
    }

    const sipoonkorpiRow = within(assignedSection).getByText("Sipoonkorpi").closest("tr");

    if (!(sipoonkorpiRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected Sipoonkorpi visit row");
    }

    mockElementFromPoint(sipoonkorpiRow);

    const reorderButtons = within(assignedSection).getAllByRole("button", {
      name: "controlPanel.trips.assignments.table.reorderVisit",
    });

    await user.pointer([
      { target: reorderButtons[0], keys: "[MouseLeft>]", coords: { x: 10, y: 10 } },
      { target: reorderButtons[0], coords: { x: 22, y: 20 } },
    ]);
    await user.pointer([{ target: reorderButtons[0], keys: "[/MouseLeft]" }]);

    await waitFor(() => {
      expect(screen.getByText("save failed")).toBeInTheDocument();
      expect(getAssignedVisitOrder(assignedSection)).toEqual(["11", "13"]);
    });
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

  it("restores the available visit when attaching fails", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("attach failed"));

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

    await waitFor(() => {
      expect(screen.getByText("attach failed")).toBeInTheDocument();
      expect(within(availableSection).getByText("Pallas-Yllästunturi")).toBeInTheDocument();
    });
  });

  it("restores the assigned visit when removing fails", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("remove failed"));

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

    await waitFor(() => {
      expect(screen.getByText("remove failed")).toBeInTheDocument();
      expect(within(assignedSection).getByText("Nuuksio")).toBeInTheDocument();
    });
  });

  it("shows the assigned empty state when the current trip has no visits", () => {
    render(<TripVisitAssignments trip={currentTrip} visits={[visits[0], visits[3]]} />);

    expect(screen.getByText("controlPanel.trips.assignments.assignedEmpty")).toBeInTheDocument();
  });
});
