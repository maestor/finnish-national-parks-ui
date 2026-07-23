import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Trip } from "@/lib/trips";
import { TripForm } from "./trip-form";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockBack = vi.fn();
const { mockResolveLocationFromCoordinate, mockRevalidatePublicCache } = vi.hoisted(() => ({
  mockResolveLocationFromCoordinate: vi.fn(),
  mockRevalidatePublicCache: vi.fn(async () => true),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/public-cache", () => ({
  revalidatePublicCache: mockRevalidatePublicCache,
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
  useRouter: () => ({ push: mockPush, refresh: mockRefresh, back: mockBack }),
}));

const tripToEdit = {
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
} satisfies Trip;

const tripWithStartingPoint = {
  ...tripToEdit,
  startingPoint: {
    coordinate: { lat: 62.24147, lon: 25.72088 },
    label: "Jyvaskyla",
  },
} satisfies Trip;

describe("TripForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveLocationFromCoordinate.mockReset();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });

  it("redirects a newly created trip to the edit page", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ...tripToEdit,
      id: 12,
    });

    render(<TripForm />);

    await userEvent.type(
      screen.getByLabelText(/controlPanel.trips.form.nameLabel/i),
      "Lapin kierros",
    );
    await userEvent.type(
      screen.getByLabelText(/controlPanel.trips.form.descriptionLabel/i),
      "Yhdessa koottu retkiviikko.",
    );
    await userEvent.click(screen.getByRole("button", { name: /controlPanel.trips.form.submit/i }));

    expect(apiFetch).toHaveBeenCalledWith("/api/trips", {
      method: "POST",
      body: JSON.stringify({
        description: "Yhdessa koottu retkiviikko.",
        name: "Lapin kierros",
        startingPoint: null,
      }),
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/hallinta/retket/12/muokkaa?created=1");
    });
    expect(mockRevalidatePublicCache).toHaveBeenCalled();
  });

  it("validates that name is required", async () => {
    render(<TripForm />);

    fireEvent.click(screen.getByRole("button", { name: /controlPanel.trips.form.submit/i }));

    expect(screen.getByText("controlPanel.trips.form.validation.nameRequired")).toBeInTheDocument();
  });

  it("submits trip updates and shows the success state", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ...tripToEdit,
      name: "Lapin kierros",
      slug: "lapin-kierros",
    });

    render(<TripForm tripToEdit={tripToEdit} />);

    await userEvent.clear(screen.getByLabelText(/controlPanel.trips.form.nameLabel/i));
    await userEvent.type(
      screen.getByLabelText(/controlPanel.trips.form.nameLabel/i),
      "Lapin kierros",
    );

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.trips.form.submit/i }));

    expect(apiFetch).toHaveBeenCalledWith("/api/trips/7", {
      method: "PATCH",
      body: JSON.stringify({
        name: "Lapin kierros",
      }),
    });
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("controlPanel.trips.form.updateSuccess");
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("requires a selected starting point when free text is entered", async () => {
    render(<TripForm />);

    await userEvent.type(
      screen.getByRole("combobox", {
        name: /controlPanel.trips.form.startingPointLabel/i,
      }),
      "Tampere",
    );
    await userEvent.click(screen.getByRole("button", { name: /controlPanel.trips.form.submit/i }));

    expect(
      screen.getByText("controlPanel.trips.form.validation.startingPointSelectionRequired"),
    ).toBeInTheDocument();
  });

  it("clears an existing starting point and submits it as null", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ...tripWithStartingPoint,
      startingPoint: null,
    });

    render(<TripForm tripToEdit={tripWithStartingPoint} />);

    await userEvent.click(
      screen.getByRole("button", {
        name: /controlPanel.trips.form.clearStartingPoint/i,
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: /controlPanel.trips.form.submit/i }));

    expect(apiFetch).toHaveBeenCalledWith("/api/trips/7", {
      method: "PATCH",
      body: JSON.stringify({
        startingPoint: null,
      }),
    });
  });

  it("uses the current location as the starting point", async () => {
    const { apiFetch } = await import("@/lib/api");
    mockResolveLocationFromCoordinate.mockResolvedValueOnce({
      coordinate: { lat: 61.4978, lon: 23.761 },
      label: "Tampere",
    });
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ...tripToEdit,
      startingPoint: {
        coordinate: { lat: 61.4978, lon: 23.761 },
        label: "Tampere",
      },
    });

    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) =>
          success({
            coords: {
              latitude: 61.4978,
              longitude: 23.761,
            },
          } as GeolocationPosition),
        ),
      },
    });

    render(<TripForm tripToEdit={tripToEdit} />);

    await userEvent.click(
      screen.getByRole("button", {
        name: /controlPanel.trips.form.useCurrentLocation/i,
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", {
          name: /controlPanel.trips.form.startingPointLabel/i,
        }),
      ).toHaveValue("Tampere");
    });

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.trips.form.submit/i }));

    expect(apiFetch).toHaveBeenCalledWith("/api/trips/7", {
      method: "PATCH",
      body: JSON.stringify({
        startingPoint: {
          coordinate: { lat: 61.4978, lon: 23.761 },
          label: "Tampere",
        },
      }),
    });
  });

  it("shows a permission error when current location lookup fails", async () => {
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((_success: PositionCallback, error?: PositionErrorCallback) =>
          error?.({ code: 1 } as GeolocationPositionError),
        ),
      },
    });

    render(<TripForm />);

    await userEvent.click(
      screen.getByRole("button", {
        name: /controlPanel.trips.form.useCurrentLocation/i,
      }),
    );

    expect(
      screen.getByText("controlPanel.trips.form.locationPermissionDenied"),
    ).toBeInTheDocument();
  });

  it("shows an unsupported-location message when geolocation is unavailable", async () => {
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });

    render(<TripForm />);

    await userEvent.click(
      screen.getByRole("button", {
        name: /controlPanel.trips.form.useCurrentLocation/i,
      }),
    );

    expect(screen.getByText("controlPanel.trips.form.locationUnsupported")).toBeInTheDocument();
  });

  it("does not submit an unchanged trip edit", async () => {
    const { apiFetch } = await import("@/lib/api");

    render(<TripForm tripToEdit={tripToEdit} />);

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.trips.form.submit/i }));

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("returns to the trips list after deleting a trip", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<TripForm tripToEdit={tripToEdit} />);

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.trips.form.delete/i }));

    expect(apiFetch).toHaveBeenCalledWith("/api/trips/7", { method: "DELETE" });
    expect(mockPush).toHaveBeenCalledWith("/hallinta/retket");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("does not delete the trip when deletion is canceled", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );

    render(<TripForm tripToEdit={tripToEdit} />);

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.trips.form.delete/i }));

    expect(apiFetch).not.toHaveBeenCalled();
  });
});
