import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { prepareImageFileForUpload } from "@/lib/image-upload";
import type { VisitWithPark } from "@/lib/parks";
import type { TripDetail } from "@/lib/trips";
import { TripVisitAssignments } from "./trip-visit-assignments";

const mockRefresh = vi.fn();
const { mockIsLocalImageUploadMode, mockResolveLocationFromCoordinate, mockRevalidatePublicCache } =
  vi.hoisted(() => ({
    mockIsLocalImageUploadMode: vi.fn(() => true),
    mockResolveLocationFromCoordinate: vi.fn(),
    mockRevalidatePublicCache: vi.fn(async () => true),
  }));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/public-cache", () => ({
  revalidatePublicCache: mockRevalidatePublicCache,
}));

vi.mock("@/lib/image-upload", () => ({
  prepareImageFileForUpload: vi.fn(async (file: File) => file),
  isLocalImageUploadMode: mockIsLocalImageUploadMode,
}));

vi.mock("@/lib/location", async () => {
  const actual = await vi.importActual<typeof import("@/lib/location")>("@/lib/location");

  return {
    ...actual,
    getUserLocationStatusFromError: vi.fn(() => "permissionDenied"),
    resolveLocationFromCoordinate: mockResolveLocationFromCoordinate,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

Object.defineProperty(globalThis, "URL", {
  value: {
    createObjectURL: vi.fn(() => "blob:mock-url"),
    revokeObjectURL: vi.fn(),
  },
  writable: true,
});

const currentTrip = {
  id: 7,
  name: "Keski-Suomen kesaretki",
  slug: "keski-suomen-kesaretki",
  description: "Kolmen paivan kierros kansallispuistoihin.",
  startingPoint: {
    coordinate: { lat: 62.24147, lon: 25.72088 },
    displayName: "Jyvaskyla",
    label: "Jyvaskyla",
  },
  visitCount: 1,
  dateRange: {
    start: "2024-06-14",
    end: "2024-06-15",
  },
  createdAt: "2024-06-18T00:00:00Z",
  updatedAt: "2024-06-18T00:00:00Z",
  itinerary: [
    {
      kind: "visit",
      tripStopOrder: 1,
      visit: {
        id: 11,
        park: {
          slug: "nuuksio",
          name: "Nuuksio",
        },
        visitedOn: "2024-06-14",
        route: null,
        excludeFromRoute: true,
        author: null,
        location: null,
        note: null,
        createdAt: "2024-06-14T00:00:00Z",
        updatedAt: "2024-06-14T00:00:00Z",
      },
    },
    {
      kind: "stop",
      tripStopOrder: 2,
      stop: {
        id: 21,
        images: [],
        location: {
          coordinate: { lat: 61.92411, lon: 25.74815 },
          displayName: "Lounaspaikka Jyvaskyla",
          label: "Lounaspaikka Jyvaskyla",
        },
        note: "Lounastauko",
        createdAt: "2024-06-14T12:00:00Z",
        updatedAt: "2024-06-14T12:00:00Z",
        tripStopOrder: 2,
        visitedOn: "2024-06-15",
      },
    },
  ],
} satisfies TripDetail;

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
    excludeFromRoute: false,
    author: "Maija",
    location: null,
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
      slug: currentTrip.slug,
    },
    visitedOn: "2024-06-14",
    route: null,
    excludeFromRoute: true,
    author: null,
    location: null,
    note: null,
    createdAt: "2024-06-14T00:00:00Z",
    tripStopOrder: 1,
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
      slug: "syysloman-rengasreitti",
    },
    visitedOn: "2024-06-13",
    route: "Korpinkierros",
    excludeFromRoute: false,
    author: null,
    location: null,
    note: null,
    createdAt: "2024-06-13T00:00:00Z",
    tripStopOrder: 1,
    updatedAt: "2024-06-13T00:00:00Z",
    images: [],
  },
] satisfies VisitWithPark[];

const visitsWithTwoAvailable = [
  ...visits,
  {
    id: 13,
    park: {
      slug: "liesjarvi",
      name: "Liesjarvi",
    },
    trip: null,
    visitedOn: "2024-06-12",
    route: "Kyynarharju",
    excludeFromRoute: false,
    author: "Liisa",
    location: null,
    note: null,
    createdAt: "2024-06-12T00:00:00Z",
    tripStopOrder: null,
    updatedAt: "2024-06-12T00:00:00Z",
    images: [],
  },
] satisfies VisitWithPark[];

const emptyTrip = {
  ...currentTrip,
  startingPoint: null,
  itinerary: [],
  visitCount: 0,
} satisfies TripDetail;

const tripWithoutDateRange = {
  ...currentTrip,
  dateRange: null,
} satisfies TripDetail;

const tripWithThreeAssignedItems = {
  ...currentTrip,
  itinerary: [
    ...currentTrip.itinerary,
    {
      kind: "visit",
      tripStopOrder: 3,
      visit: {
        id: 14,
        park: {
          slug: "pallas",
          name: "Pallas-Yllästunturi",
        },
        visitedOn: "2024-06-15",
        route: "Huippupolku",
        excludeFromRoute: false,
        author: "Maija",
        location: null,
        note: null,
        createdAt: "2024-06-15T00:00:00Z",
        updatedAt: "2024-06-15T00:00:00Z",
      },
    },
  ],
  visitCount: 2,
} satisfies TripDetail;

const tripWithLongStopNote = {
  ...currentTrip,
  itinerary: currentTrip.itinerary.map((item) =>
    item.kind === "stop"
      ? {
          ...item,
          stop: {
            ...item.stop,
            note: "Tulimme ajoissa paikalle ja farmi avautui klo 11, sopivasti pizzaa tuntia aiemmin...",
          },
        }
      : item,
  ),
} satisfies TripDetail;

const createImage = (id: number) => ({
  id,
  fullUrl: `https://example.com/full-${id}.jpg`,
  thumbUrl: `https://example.com/thumb-${id}.jpg`,
  fullWidth: 1920,
  fullHeight: 1080,
  thumbWidth: 400,
  thumbHeight: 225,
  originalName: `image-${id}.jpg`,
  displayOrder: id - 1,
  createdAt: "2024-06-15T10:00:00Z",
});

const getItineraryOrder = (section: HTMLElement) =>
  Array.from(section.querySelectorAll("[data-itinerary-item-key]")).map((row) =>
    row.getAttribute("data-itinerary-item-key"),
  );

const mockItineraryRowLayout = (section: HTMLElement) => {
  const rows = Array.from(section.querySelectorAll<HTMLElement>("[data-itinerary-item-key]"));

  rows.forEach((row, index) => {
    const top = 100 + index * 48;
    const height = 40;

    Object.defineProperty(row, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        x: 0,
        y: top,
        width: 400,
        height,
        top,
        bottom: top + height,
        left: 0,
        right: 400,
        toJSON: () => null,
      }),
    });
  });
};

describe("TripVisitAssignments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockReset();
    vi.mocked(prepareImageFileForUpload).mockImplementation(async (file: File) => file);
    mockIsLocalImageUploadMode.mockReturnValue(true);
    mockResolveLocationFromCoordinate.mockReset();
    mockRevalidatePublicCache.mockReset();
    mockRevalidatePublicCache.mockResolvedValue(true);
    mockRefresh.mockReset();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });

  it("renders the starting point, mixed itinerary, and unassigned visits", () => {
    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);
    const availableSection = screen
      .getByRole("heading", {
        name: "controlPanel.trips.assignments.availableTitle",
      })
      .closest("section");

    if (!(availableSection instanceof HTMLElement)) {
      throw new Error("Expected available visits section");
    }

    expect(screen.getByText("Jyvaskyla")).toBeInTheDocument();
    expect(screen.getAllByText("Nuuksio").length).toBeGreaterThan(0);
    expect(
      screen.getByText("controlPanel.trips.assignments.excludedFromRoute"),
    ).toBeInTheDocument();
    expect(screen.getByText("Lounaspaikka Jyvaskyla")).toBeInTheDocument();
    expect(screen.getAllByText("Pallas-Yllästunturi").length).toBeGreaterThan(0);
    expect(within(availableSection).queryByText("Repovesi")).not.toBeInTheDocument();
  });

  it("truncates long stop notes in the itinerary table preview", () => {
    render(<TripVisitAssignments trip={tripWithLongStopNote} visits={visits} />);

    expect(
      screen.getByText("Tulimme ajoissa paikalle ja farmi avautui klo 11, ..."),
    ).toBeInTheDocument();
  });

  it("toggles route exclusion for an assigned visit", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.includeInRouteAction",
      }),
    );

    expect(apiFetch).toHaveBeenCalledWith("/api/visits/11", {
      method: "PATCH",
      body: JSON.stringify({
        excludeFromRoute: false,
      }),
    });
    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({
      parkSlug: "nuuksio",
      tripSlug: "keski-suomen-kesaretki",
    });
  });

  it("keeps stop creation on the itinerary side and limits the available visits list height", async () => {
    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const itinerarySection = screen
      .getByRole("heading", {
        name: "controlPanel.trips.assignments.assignedTitle",
      })
      .closest("section");
    const availableSection = screen
      .getByRole("heading", {
        name: "controlPanel.trips.assignments.availableTitle",
      })
      .closest("section");

    if (!(itinerarySection instanceof HTMLElement) || !(availableSection instanceof HTMLElement)) {
      throw new Error("Expected trip assignment sections");
    }

    expect(
      screen.queryByRole("combobox", {
        name: "controlPanel.trips.assignments.stopLocationLabel",
      }),
    ).not.toBeInTheDocument();

    const openStopButton = within(itinerarySection).getByRole("button", {
      name: "controlPanel.trips.assignments.addStopAction",
    });
    expect(openStopButton).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(openStopButton);

    expect(
      screen.getByRole("combobox", {
        name: "controlPanel.trips.assignments.stopLocationLabel",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.cancelStopAdd",
      }),
    ).toBeInTheDocument();
    const availableScrollArea = within(availableSection).getByTestId(
      "available-visits-scroll-area",
    );
    expect(availableScrollArea).toHaveClass("max-h-144", "overflow-y-auto");
    expect(within(availableScrollArea).getByRole("table")).toHaveClass("table-fixed");
    expect(
      within(availableScrollArea).getByRole("button", {
        name: "controlPanel.trips.assignments.attachAction",
      }),
    ).toHaveClass("whitespace-nowrap");
  });

  it("does not allow adding a stop before the trip has any visits", () => {
    render(<TripVisitAssignments trip={emptyTrip} visits={visits} />);

    expect(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.addStopAction",
      }),
    ).toBeDisabled();
    expect(
      screen.getByText("controlPanel.trips.assignments.addStopRequiresVisit"),
    ).toBeInTheDocument();
  });

  it("does not allow adding a stop when the trip has no date range", () => {
    render(<TripVisitAssignments trip={tripWithoutDateRange} visits={visits} />);

    expect(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.addStopAction",
      }),
    ).toBeDisabled();
    expect(
      screen.getByText("controlPanel.trips.assignments.addStopRequiresDateRange"),
    ).toBeInTheDocument();
  });

  it("renders the empty itinerary and starting-point fallback states", () => {
    render(<TripVisitAssignments trip={emptyTrip} visits={[visits[2]]} />);

    expect(
      screen.getByText("controlPanel.trips.assignments.startingPointEmpty"),
    ).toBeInTheDocument();
    expect(screen.getByText("controlPanel.trips.assignments.assignedEmpty")).toBeInTheDocument();
    expect(screen.getByText("controlPanel.trips.assignments.availableEmpty")).toBeInTheDocument();
  });

  it("attaches an unassigned visit to the current trip", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    await userEvent.click(
      screen.getByRole("button", {
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
    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({
      parkSlug: "pallas",
      tripSlug: "keski-suomen-kesaretki",
    });
  });

  it("locks other trip actions while a visit attach is still pending", async () => {
    const { apiFetch } = await import("@/lib/api");
    let resolveAttach!: () => void;
    const attachPromise = new Promise<void>((resolve) => {
      resolveAttach = resolve;
    });
    vi.mocked(apiFetch).mockImplementationOnce(() => attachPromise);

    render(<TripVisitAssignments trip={currentTrip} visits={visitsWithTwoAvailable} />);

    const attachButtonsBeforeClick = screen.getAllByRole("button", {
      name: "controlPanel.trips.assignments.attachAction",
    });

    await userEvent.click(attachButtonsBeforeClick[0]);

    const remainingAttachButton = screen.getByRole("button", {
      name: "controlPanel.trips.assignments.attachAction",
    });
    const removeVisitButton = screen.getByRole("button", {
      name: "controlPanel.trips.assignments.removeVisitAction",
    });
    const addStopButton = screen.getByRole("button", {
      name: "controlPanel.trips.assignments.addStopAction",
    });

    expect(remainingAttachButton).toBeDisabled();
    expect(removeVisitButton).toBeDisabled();
    expect(addStopButton).toBeDisabled();

    resolveAttach();

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("resets the visit filters", async () => {
    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    await userEvent.type(
      screen.getByLabelText("controlPanel.trips.assignments.filters.searchLabel"),
      "Pallas",
    );
    await userEvent.selectOptions(
      screen.getByLabelText("controlPanel.trips.assignments.filters.parkLabel"),
      "nuuksio",
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.filters.reset",
      }),
    );

    expect(screen.getByLabelText("controlPanel.trips.assignments.filters.searchLabel")).toHaveValue(
      "",
    );
    expect(screen.getByLabelText("controlPanel.trips.assignments.filters.parkLabel")).toHaveValue(
      "",
    );
  });

  it("keeps itinerary reorders local until saving and disables other actions while the new order is unsaved", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const itinerarySection = screen
      .getByRole("heading", {
        name: "controlPanel.trips.assignments.assignedTitle",
      })
      .closest("section");
    const stopRow =
      itinerarySection instanceof HTMLElement
        ? within(itinerarySection).getByText("Lounaspaikka Jyvaskyla").closest("tr")
        : null;

    if (!(itinerarySection instanceof HTMLElement) || !(stopRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected itinerary row");
    }

    mockItineraryRowLayout(itinerarySection);

    const visitRow = within(itinerarySection).getByText("Nuuksio").closest("tr");

    if (!(visitRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected itinerary visit row");
    }

    const reorderButton = within(visitRow).getByRole("button", {
      name: "controlPanel.trips.assignments.table.reorderItem",
    });

    expect(getItineraryOrder(itinerarySection)).toEqual(["visit-11", "stop-21"]);

    await user.pointer([
      { target: reorderButton, keys: "[MouseLeft>]", coords: { x: 10, y: 120 } },
      { target: reorderButton, coords: { x: 10, y: 168 } },
    ]);

    await waitFor(() => {
      expect(getItineraryOrder(itinerarySection)).toEqual(["stop-21", "visit-11"]);
    });

    await user.pointer([{ target: reorderButton, keys: "[/MouseLeft]" }]);

    expect(apiFetch).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.saveOrder",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.restoreOrder",
      }),
    ).toBeInTheDocument();
    expect(
      within(itinerarySection).getByRole("button", {
        name: "controlPanel.trips.assignments.removeVisitAction",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.attachAction",
      }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.saveOrder",
      }),
    );

    expect(apiFetch).toHaveBeenNthCalledWith(1, "/api/trip-stops/21", {
      method: "PATCH",
      body: JSON.stringify({
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

    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({
      tripSlug: "keski-suomen-kesaretki",
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("keeps the first drag from cascading to the bottom when later pointer events hit shifted rows", async () => {
    const user = userEvent.setup();

    render(
      <TripVisitAssignments trip={tripWithThreeAssignedItems} visits={visitsWithTwoAvailable} />,
    );

    const itinerarySection = screen
      .getByRole("heading", {
        name: "controlPanel.trips.assignments.assignedTitle",
      })
      .closest("section");
    const stopRow =
      itinerarySection instanceof HTMLElement
        ? within(itinerarySection).getByText("Lounaspaikka Jyvaskyla").closest("tr")
        : null;
    const thirdRow =
      itinerarySection instanceof HTMLElement
        ? within(itinerarySection).getByText("Pallas-Yllästunturi").closest("tr")
        : null;
    const visitRow =
      itinerarySection instanceof HTMLElement
        ? within(itinerarySection).getByText("Nuuksio").closest("tr")
        : null;

    if (
      !(itinerarySection instanceof HTMLElement) ||
      !(stopRow instanceof HTMLTableRowElement) ||
      !(thirdRow instanceof HTMLTableRowElement) ||
      !(visitRow instanceof HTMLTableRowElement)
    ) {
      throw new Error("Expected itinerary rows");
    }

    mockItineraryRowLayout(itinerarySection);

    const reorderButton = within(visitRow).getByRole("button", {
      name: "controlPanel.trips.assignments.table.reorderItem",
    });

    await user.pointer([
      { target: reorderButton, keys: "[MouseLeft>]", coords: { x: 10, y: 120 } },
      { target: reorderButton, coords: { x: 10, y: 168 } },
      { target: reorderButton, coords: { x: 10, y: 170 } },
    ]);

    await waitFor(() => {
      expect(getItineraryOrder(itinerarySection)).toEqual(["stop-21", "visit-11", "visit-14"]);
    });
  });

  it("keeps an unsaved itinerary reorder when the same trip props refresh", async () => {
    const user = userEvent.setup();
    const refreshedTrip = {
      ...currentTrip,
      itinerary: [...currentTrip.itinerary],
    } satisfies TripDetail;

    const { rerender } = render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const itinerarySection = screen
      .getByRole("heading", {
        name: "controlPanel.trips.assignments.assignedTitle",
      })
      .closest("section");
    const visitRow =
      itinerarySection instanceof HTMLElement
        ? within(itinerarySection).getByText("Nuuksio").closest("tr")
        : null;

    if (!(itinerarySection instanceof HTMLElement) || !(visitRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected itinerary row");
    }

    mockItineraryRowLayout(itinerarySection);

    const reorderButton = within(visitRow).getByRole("button", {
      name: "controlPanel.trips.assignments.table.reorderItem",
    });

    await user.pointer([
      { target: reorderButton, keys: "[MouseLeft>]", coords: { x: 10, y: 120 } },
      { target: reorderButton, coords: { x: 10, y: 168 } },
    ]);

    await waitFor(() => {
      expect(getItineraryOrder(itinerarySection)).toEqual(["stop-21", "visit-11"]);
    });

    rerender(<TripVisitAssignments trip={refreshedTrip} visits={visits} />);

    expect(getItineraryOrder(itinerarySection)).toEqual(["stop-21", "visit-11"]);
    expect(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.saveOrder",
      }),
    ).toBeInTheDocument();
  });

  it("restores the previous itinerary order when a drag is canceled", async () => {
    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const itinerarySection = screen
      .getByRole("heading", {
        name: "controlPanel.trips.assignments.assignedTitle",
      })
      .closest("section");
    const stopRow =
      itinerarySection instanceof HTMLElement
        ? within(itinerarySection).getByText("Lounaspaikka Jyvaskyla").closest("tr")
        : null;
    const visitRow =
      itinerarySection instanceof HTMLElement
        ? within(itinerarySection).getByText("Nuuksio").closest("tr")
        : null;

    if (
      !(itinerarySection instanceof HTMLElement) ||
      !(stopRow instanceof HTMLTableRowElement) ||
      !(visitRow instanceof HTMLTableRowElement)
    ) {
      throw new Error("Expected itinerary rows");
    }

    mockItineraryRowLayout(itinerarySection);

    const reorderButton = within(visitRow).getByRole("button", {
      name: "controlPanel.trips.assignments.table.reorderItem",
    });

    fireEvent.pointerDown(reorderButton, { pointerId: 1, clientX: 10, clientY: 120 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 10, clientY: 168 });

    await waitFor(() => {
      expect(getItineraryOrder(itinerarySection)).toEqual(["stop-21", "visit-11"]);
    });

    fireEvent.pointerCancel(window, { pointerId: 1 });

    await waitFor(() => {
      expect(getItineraryOrder(itinerarySection)).toEqual(["visit-11", "stop-21"]);
    });
  });

  it("removes an assigned visit from the trip", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const itinerarySection = screen
      .getByRole("heading", {
        name: "controlPanel.trips.assignments.assignedTitle",
      })
      .closest("section");
    const visitRow =
      itinerarySection instanceof HTMLElement
        ? within(itinerarySection).getByText("Nuuksio").closest("tr")
        : null;

    if (!(visitRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected visit row");
    }

    await userEvent.click(
      within(visitRow).getByRole("button", {
        name: "controlPanel.trips.assignments.removeVisitAction",
      }),
    );

    expect(apiFetch).toHaveBeenCalledWith("/api/visits/11", {
      method: "PATCH",
      body: JSON.stringify({
        tripId: null,
      }),
    });
    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({
      parkSlug: "nuuksio",
      tripSlug: "keski-suomen-kesaretki",
    });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("validates that a stop needs a selected location", async () => {
    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.addStopAction",
      }),
    );

    await userEvent.selectOptions(
      screen.getByLabelText("controlPanel.trips.assignments.stopVisitedOnLabel"),
      "2024-06-15",
    );
    await userEvent.type(
      screen.getByRole("combobox", {
        name: "controlPanel.trips.assignments.stopLocationLabel",
      }),
      "Mikkeli",
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.addStopAction",
      }),
    );

    expect(
      screen.getByText("controlPanel.trips.assignments.validation.stopLocationSelectionRequired"),
    ).toBeInTheDocument();
  });

  it("validates that a stop needs a selected day", async () => {
    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.addStopAction",
      }),
    );
    await userEvent.type(
      screen.getByRole("combobox", {
        name: "controlPanel.trips.assignments.stopLocationLabel",
      }),
      "Mikkeli",
    );

    expect(screen.getByLabelText("controlPanel.trips.assignments.stopVisitedOnLabel")).toHaveValue(
      "",
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.addStopAction",
      }),
    );

    expect(
      screen.getByText("controlPanel.trips.assignments.validation.stopVisitedOnRequired"),
    ).toBeInTheDocument();
  });

  it("allows selecting the day before and after the trip date range for stops", async () => {
    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.addStopAction",
      }),
    );

    expect(screen.getByLabelText("controlPanel.trips.assignments.stopVisitedOnLabel")).toHaveValue(
      "",
    );

    const dateSelect = screen.getByLabelText("controlPanel.trips.assignments.stopVisitedOnLabel");
    const optionValues = within(dateSelect)
      .getAllByRole("option")
      .map((option) => option.getAttribute("value"));

    expect(optionValues).toEqual(["", "2024-06-13", "2024-06-14", "2024-06-15", "2024-06-16"]);
  });

  it("creates a stop using the current location", async () => {
    const { apiFetch } = await import("@/lib/api");
    mockResolveLocationFromCoordinate.mockResolvedValueOnce({
      coordinate: { lat: 61.6886, lon: 27.2736 },
      label: "Mikkeli",
    });
    vi.mocked(apiFetch).mockResolvedValueOnce({
      id: 33,
      images: [],
      location: {
        coordinate: { lat: 61.6886, lon: 27.2736 },
        displayName: "Mikkeli",
        label: "Mikkeli",
      },
      note: "Yopyminen",
      createdAt: "2024-06-15T18:00:00Z",
      updatedAt: "2024-06-15T18:00:00Z",
      tripStopOrder: 3,
      visitedOn: "2024-06-15",
    });

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) =>
          success({
            coords: {
              latitude: 61.6886,
              longitude: 27.2736,
            },
          } as GeolocationPosition),
        ),
      },
    });

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.addStopAction",
      }),
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.useCurrentLocation",
      }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole("combobox", {
          name: "controlPanel.trips.assignments.stopLocationLabel",
        }),
      ).toHaveValue("Mikkeli");
    });
    await userEvent.selectOptions(
      screen.getByLabelText("controlPanel.trips.assignments.stopVisitedOnLabel"),
      "2024-06-15",
    );
    await userEvent.type(
      screen.getByLabelText("controlPanel.trips.assignments.stopNoteLabel"),
      "Yopyminen",
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.addStopAction",
      }),
    );

    expect(apiFetch).toHaveBeenCalledWith("/api/trips/7/stops", {
      method: "POST",
      body: JSON.stringify({
        location: {
          coordinate: { lat: 61.6886, lon: 27.2736 },
          label: "Mikkeli",
        },
        note: "Yopyminen",
        tripStopOrder: 3,
        visitedOn: "2024-06-15",
      }),
    });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("lets a new stop choose its insertion order", async () => {
    mockResolveLocationFromCoordinate.mockResolvedValueOnce({
      coordinate: { lat: 61.6886, lon: 27.2736 },
      label: "Mikkeli",
    });
    vi.mocked(apiFetch).mockResolvedValueOnce({
      id: 33,
      images: [],
      location: {
        coordinate: { lat: 61.6886, lon: 27.2736 },
        displayName: "Mikkeli",
        label: "Mikkeli",
      },
      note: null,
      createdAt: "2024-06-15T18:00:00Z",
      updatedAt: "2024-06-15T18:00:00Z",
      tripStopOrder: 1,
      visitedOn: "2024-06-15",
    });

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) =>
          success({
            coords: {
              latitude: 61.6886,
              longitude: 27.2736,
            },
          } as GeolocationPosition),
        ),
      },
    });

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.addStopAction",
      }),
    );

    expect(screen.getByLabelText("controlPanel.trips.assignments.stopOrderLabel")).toHaveValue("3");
    const orderSelect = screen.getByLabelText("controlPanel.trips.assignments.stopOrderLabel");
    const optionLabels = within(orderSelect)
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(optionLabels).toEqual([
      "1 - controlPanel.trips.assignments.stopOrderFirst",
      "2 - controlPanel.trips.assignments.stopOrderAfter",
      "3 - controlPanel.trips.assignments.stopOrderLast",
    ]);

    await userEvent.selectOptions(orderSelect, "1");
    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.useCurrentLocation",
      }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole("combobox", {
          name: "controlPanel.trips.assignments.stopLocationLabel",
        }),
      ).toHaveValue("Mikkeli");
    });
    await userEvent.selectOptions(
      screen.getByLabelText("controlPanel.trips.assignments.stopVisitedOnLabel"),
      "2024-06-15",
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.addStopAction",
      }),
    );

    expect(apiFetch).toHaveBeenCalledWith("/api/trips/7/stops", {
      method: "POST",
      body: JSON.stringify({
        location: {
          coordinate: { lat: 61.6886, lon: 27.2736 },
          label: "Mikkeli",
        },
        note: null,
        tripStopOrder: 1,
        visitedOn: "2024-06-15",
      }),
    });
  });

  it("shows an unsupported-location message when stop geolocation is unavailable", async () => {
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.addStopAction",
      }),
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.useCurrentLocation",
      }),
    );

    expect(
      screen.getByText("controlPanel.trips.assignments.locationUnsupported"),
    ).toBeInTheDocument();
  });

  it("shows an error when creating a stop fails", async () => {
    const { apiFetch } = await import("@/lib/api");
    mockResolveLocationFromCoordinate.mockResolvedValueOnce({
      coordinate: { lat: 61.6886, lon: 27.2736 },
      label: "Mikkeli",
    });
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("stop failed"));

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) =>
          success({
            coords: {
              latitude: 61.6886,
              longitude: 27.2736,
            },
          } as GeolocationPosition),
        ),
      },
    });

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.addStopAction",
      }),
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.useCurrentLocation",
      }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole("combobox", {
          name: "controlPanel.trips.assignments.stopLocationLabel",
        }),
      ).toHaveValue("Mikkeli");
    });
    await userEvent.selectOptions(
      screen.getByLabelText("controlPanel.trips.assignments.stopVisitedOnLabel"),
      "2024-06-15",
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.addStopAction",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("stop failed")).toBeInTheDocument();
    });
  });

  it("deletes an existing stop", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const stopRow = screen.getByText("Lounaspaikka Jyvaskyla").closest("tr");

    if (!(stopRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected stop row");
    }

    await userEvent.click(
      within(stopRow).getByRole("button", {
        name: "controlPanel.trips.assignments.deleteStopAction",
      }),
    );

    expect(apiFetch).toHaveBeenCalledWith("/api/trip-stops/21", {
      method: "DELETE",
    });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("does not delete a stop when deletion is canceled", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const stopRow = screen.getByText("Lounaspaikka Jyvaskyla").closest("tr");

    if (!(stopRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected stop row");
    }

    await userEvent.click(
      within(stopRow).getByRole("button", {
        name: "controlPanel.trips.assignments.deleteStopAction",
      }),
    );

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("shows an error when deleting a stop fails", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("delete failed"));

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const stopRow = screen.getByText("Lounaspaikka Jyvaskyla").closest("tr");

    if (!(stopRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected stop row");
    }

    await userEvent.click(
      within(stopRow).getByRole("button", {
        name: "controlPanel.trips.assignments.deleteStopAction",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("delete failed")).toBeInTheDocument();
    });
  });

  it("shows an error when detaching a visit fails", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("remove failed"));

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const itinerarySection = screen
      .getByRole("heading", {
        name: "controlPanel.trips.assignments.assignedTitle",
      })
      .closest("section");
    const visitRow =
      itinerarySection instanceof HTMLElement
        ? within(itinerarySection).getByText("Nuuksio").closest("tr")
        : null;

    if (!(visitRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected visit row");
    }

    await userEvent.click(
      within(visitRow).getByRole("button", {
        name: "controlPanel.trips.assignments.removeVisitAction",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("remove failed")).toBeInTheDocument();
    });
  });

  it("resets stop editing state when the edited stop is deleted", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const stopRow = screen.getByText("Lounaspaikka Jyvaskyla").closest("tr");

    if (!(stopRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected stop row");
    }

    await userEvent.click(
      within(stopRow).getByRole("button", {
        name: "controlPanel.trips.assignments.editStopAction",
      }),
    );

    expect(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.cancelStopEdit",
      }),
    ).toBeInTheDocument();

    await userEvent.click(
      within(stopRow).getByRole("button", {
        name: "controlPanel.trips.assignments.deleteStopAction",
      }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", {
          name: "controlPanel.trips.assignments.cancelStopEdit",
        }),
      ).not.toBeInTheDocument();
    });
  });

  it("syncs refreshed stop images even when the itinerary order stays the same", async () => {
    const refreshedTrip = {
      ...currentTrip,
      itinerary: currentTrip.itinerary.map((item) =>
        item.kind === "stop"
          ? {
              ...item,
              stop: {
                ...item.stop,
                images: [createImage(41)],
              },
            }
          : item,
      ),
    } satisfies TripDetail;

    const { rerender } = render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const stopRow = screen.getByText("Lounaspaikka Jyvaskyla").closest("tr");

    if (!(stopRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected stop row");
    }

    await userEvent.click(
      within(stopRow).getByRole("button", {
        name: "controlPanel.trips.assignments.editStopAction",
      }),
    );

    expect(
      screen.queryByRole("button", {
        name: "controlPanel.visits.images.deleteImage",
      }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.cancelStopEdit",
      }),
    );

    rerender(<TripVisitAssignments trip={refreshedTrip} visits={visits} />);

    await userEvent.click(
      within(stopRow).getByRole("button", {
        name: "controlPanel.trips.assignments.editStopAction",
      }),
    );

    expect(
      screen.getByRole("button", {
        name: "controlPanel.visits.images.deleteImage",
      }),
    ).toBeInTheDocument();
  });

  it("keeps uploaded stop images visible when reopening the editor without a full page refresh", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      images: [createImage(51)],
      errors: [],
    });

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const stopRow = screen.getByText("Lounaspaikka Jyvaskyla").closest("tr");

    if (!(stopRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected stop row");
    }

    await userEvent.click(
      within(stopRow).getByRole("button", {
        name: "controlPanel.trips.assignments.editStopAction",
      }),
    );

    const fileInput = document.body.querySelector('input[type="file"]');

    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error("Expected file input");
    }

    fireEvent.change(fileInput, {
      target: {
        files: [new File(["dummy"], "stop.jpg", { type: "image/jpeg" })],
      },
    });

    await waitFor(() => {
      expect(screen.getByText("controlPanel.visits.images.selectedCount")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.visits.images.upload",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "controlPanel.visits.images.deleteImage",
        }),
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.cancelStopEdit",
      }),
    );

    await userEvent.click(
      within(stopRow).getByRole("button", {
        name: "controlPanel.trips.assignments.editStopAction",
      }),
    );

    expect(
      screen.getByRole("button", {
        name: "controlPanel.visits.images.deleteImage",
      }),
    ).toBeInTheDocument();
  });

  it("reorders itinerary items with the keyboard handle", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValue(undefined);

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const itinerarySection = screen
      .getByRole("heading", {
        name: "controlPanel.trips.assignments.assignedTitle",
      })
      .closest("section");
    const visitRow =
      itinerarySection instanceof HTMLElement
        ? within(itinerarySection).getByText("Nuuksio").closest("tr")
        : null;

    if (!(itinerarySection instanceof HTMLElement) || !(visitRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected itinerary row");
    }

    const reorderButton = within(visitRow).getByRole("button", {
      name: "controlPanel.trips.assignments.table.reorderItem",
    });

    reorderButton.focus();
    await userEvent.keyboard("{ArrowDown}");

    expect(getItineraryOrder(itinerarySection)).toEqual(["stop-21", "visit-11"]);
    expect(apiFetch).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.saveOrder",
      }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.saveOrder",
      }),
    );

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledTimes(2);
    });
  });

  it("uses the primary edit action as close when stop details have not changed", async () => {
    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const stopRow = screen.getByText("Lounaspaikka Jyvaskyla").closest("tr");

    if (!(stopRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected stop row");
    }

    await userEvent.click(
      within(stopRow).getByRole("button", {
        name: "controlPanel.trips.assignments.editStopAction",
      }),
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.closeStopEdit",
      }),
    );

    expect(apiFetch).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", {
        name: "controlPanel.trips.assignments.cancelStopEdit",
      }),
    ).not.toBeInTheDocument();
  });

  it("edits an existing stop", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ...currentTrip.itinerary[1].stop,
      note: "Pitka lounastauko",
    });

    render(<TripVisitAssignments trip={currentTrip} visits={visits} />);

    const stopRow = screen.getByText("Lounaspaikka Jyvaskyla").closest("tr");

    if (!(stopRow instanceof HTMLTableRowElement)) {
      throw new Error("Expected stop row");
    }

    await userEvent.click(
      within(stopRow).getByRole("button", {
        name: "controlPanel.trips.assignments.editStopAction",
      }),
    );
    await userEvent.clear(screen.getByLabelText("controlPanel.trips.assignments.stopNoteLabel"));
    await userEvent.type(
      screen.getByLabelText("controlPanel.trips.assignments.stopNoteLabel"),
      "Pitka lounastauko",
    );
    const existingStop = currentTrip.itinerary[1];

    if (existingStop?.kind !== "stop") {
      throw new Error("Expected stop itinerary item");
    }

    await userEvent.click(
      screen.getByRole("button", {
        name: "controlPanel.trips.assignments.saveStopChanges",
      }),
    );

    expect(apiFetch).toHaveBeenCalledWith("/api/trip-stops/21", {
      method: "PATCH",
      body: JSON.stringify({
        location: existingStop.stop.location,
        note: "Pitka lounastauko",
        visitedOn: existingStop.stop.visitedOn,
      }),
    });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
