import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Trip } from "@/lib/trips";
import { TripForm } from "./trip-form";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockBack = vi.fn();
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
  useRouter: () => ({ push: mockPush, refresh: mockRefresh, back: mockBack }),
}));

const tripToEdit = {
  id: 7,
  name: "Keski-Suomen kesaretki",
  description: "Kolmen paivan kierros kansallispuistoihin.",
  visitCount: 2,
  dateRange: {
    start: "2024-06-15",
    end: "2024-06-17",
  },
  createdAt: "2024-06-18T00:00:00Z",
  updatedAt: "2024-06-18T00:00:00Z",
} satisfies Trip;

describe("TripForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        name: "Lapin kierros",
        description: "Yhdessa koottu retkiviikko.",
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
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

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
        description: "Kolmen paivan kierros kansallispuistoihin.",
      }),
    });
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("controlPanel.trips.form.updateSuccess");
    });
    expect(mockRefresh).toHaveBeenCalled();
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
});
