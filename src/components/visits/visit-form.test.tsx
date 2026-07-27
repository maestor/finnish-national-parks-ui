import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Park } from "@/lib/parks";
import { VisitForm } from "./visit-form";

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

const parks = [
  { slug: "pallas", name: "Pallas-Yllästunturi" },
  { slug: "nuuksio", name: "Nuuksio" },
] as Park[];

const visitToEdit = {
  id: 1,
  park: {
    slug: "pallas",
    name: "Pallas-Yllästunturi",
  },
  location: { lat: 67.55, lon: 24.12 },
  trip: {
    id: 7,
    name: "Keski-Suomen kesaretki",
    slug: "keski-suomen-kesaretki",
  },
  tripStopOrder: 1,
  visitedOn: "2024-06-15",
  route: "Pallas-Yllästunturin reitti",
  excludeFromRoute: true,
  author: "Maija Meikäläinen",
  note: "Great hike",
  createdAt: "2024-06-15T00:00:00Z",
  updatedAt: "2024-06-15T00:00:00Z",
  images: [],
};

describe("VisitForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });

  it("redirects a newly created visit to the edit page", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce({
      id: 42,
      visitedOn: "2024-06-15",
      route: null,
      excludeFromRoute: false,
      author: null,
      location: null,
      note: null,
      tripStopOrder: null,
      createdAt: "2024-06-15T00:00:00Z",
      updatedAt: "2024-06-15T00:00:00Z",
    });

    render(<VisitForm parks={parks} />);

    fireEvent.change(screen.getByLabelText(/controlPanel.visits.form.parkLabel/i), {
      target: { value: "pallas" },
    });
    fireEvent.change(screen.getByLabelText(/controlPanel.visits.form.dateLabel/i), {
      target: { value: "2024-06-15" },
    });
    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.submit/i }));

    expect(apiFetch).toHaveBeenCalledWith("/api/parks/pallas/visits", {
      method: "POST",
      body: JSON.stringify({
        visitedOn: "2024-06-15",
        route: null,
        author: null,
        location: null,
        note: null,
      }),
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/hallinta/kaynnit/42/muokkaa?created=1");
    });
    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "pallas" });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("keeps the create submit button pending until navigation leaves the page", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce({
      id: 42,
      visitedOn: "2024-06-15",
      route: null,
      excludeFromRoute: false,
      author: null,
      location: null,
      note: null,
      tripStopOrder: null,
      createdAt: "2024-06-15T00:00:00Z",
      updatedAt: "2024-06-15T00:00:00Z",
    });

    render(<VisitForm parks={parks} />);

    await userEvent.selectOptions(
      screen.getByLabelText(/controlPanel.visits.form.parkLabel/i),
      "pallas",
    );
    await userEvent.type(
      screen.getByLabelText(/controlPanel.visits.form.dateLabel/i),
      "2024-06-15",
    );

    const submitButton = screen.getByRole("button", {
      name: /controlPanel.visits.form.submit/i,
    });
    await userEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent("...");
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/hallinta/kaynnit/42/muokkaa?created=1");
    });
    expect(submitButton).toBeDisabled();
  });

  it("renders create form fields", () => {
    render(<VisitForm parks={parks} />);

    expect(screen.getByLabelText(/controlPanel.visits.form.parkLabel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/controlPanel.visits.form.dateLabel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/controlPanel.visits.form.routeLabel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/controlPanel.visits.form.authorLabel/i)).toBeInTheDocument();
    expect(screen.getByText(/controlPanel.visits.form.noteLabel/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /controlPanel.visits.form.submit/i }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/controlPanel.visits.form.tripLabel/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /controlPanel.visits.form.excludeFromRouteLabel/i }),
    ).not.toBeInTheDocument();
  });

  it("uses the default park when creating a visit from a park page", () => {
    render(<VisitForm parks={parks} defaultParkSlug="nuuksio" />);

    expect(screen.getByLabelText(/controlPanel.visits.form.parkLabel/i)).toHaveValue("nuuksio");
  });

  it("shows validation errors when required fields are empty", async () => {
    render(<VisitForm parks={parks} />);

    const submitButton = screen.getByRole("button", { name: /controlPanel.visits.form.submit/i });
    fireEvent.click(submitButton);

    expect(
      screen.getByText("controlPanel.visits.form.validation.parkRequired"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("controlPanel.visits.form.validation.dateRequired"),
    ).toBeInTheDocument();
  });

  it("renders edit mode with prefilled values, read-only park and delete button", () => {
    render(<VisitForm parks={parks} visitToEdit={visitToEdit} />);

    expect(screen.getByText("Pallas-Yllästunturi")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2024-06-15")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Pallas-Yllästunturin reitti")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Maija Meikäläinen")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Great hike")).toBeInTheDocument();
    expect(screen.getByLabelText(/controlPanel.visits.form.locationLatitudeLabel/i)).toHaveValue(
      67.55,
    );
    expect(screen.getByLabelText(/controlPanel.visits.form.locationLongitudeLabel/i)).toHaveValue(
      24.12,
    );
    expect(
      screen.getByRole("button", { name: /controlPanel.visits.form.delete/i }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/controlPanel.visits.form.tripLabel/i)).not.toBeInTheDocument();
  });

  it("disables the edit save button until something changes", async () => {
    render(<VisitForm parks={parks} visitToEdit={visitToEdit} />);

    const submitButton = screen.getByRole("button", {
      name: /controlPanel.visits.form.submit/i,
    });
    expect(submitButton).toBeDisabled();

    await userEvent.clear(screen.getByLabelText(/controlPanel.visits.form.routeLabel/i));
    await userEvent.type(screen.getByLabelText(/controlPanel.visits.form.routeLabel/i), "Hetta");
    expect(submitButton).toBeEnabled();

    await userEvent.clear(screen.getByLabelText(/controlPanel.visits.form.routeLabel/i));
    await userEvent.type(
      screen.getByLabelText(/controlPanel.visits.form.routeLabel/i),
      "Pallas-Yllästunturin reitti",
    );
    expect(submitButton).toBeDisabled();
  });

  it("shows a success notice and visits list link after editing a visit", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<VisitForm parks={parks} visitToEdit={visitToEdit} />);

    await userEvent.clear(screen.getByLabelText(/controlPanel.visits.form.routeLabel/i));
    await userEvent.type(screen.getByLabelText(/controlPanel.visits.form.routeLabel/i), "Hetta");

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.submit/i }));

    expect(apiFetch).toHaveBeenCalledWith("/api/visits/1", {
      method: "PATCH",
      body: JSON.stringify({
        visitedOn: "2024-06-15",
        route: "Hetta",
        author: "Maija Meikäläinen",
        location: { lat: 67.55, lon: 24.12 },
        note: "Great hike",
      }),
    });
    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getByRole("status")).toHaveTextContent(
        "controlPanel.visits.form.updateSuccess",
      );
    });
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({
      parkSlug: "pallas",
      tripSlug: "keski-suomen-kesaretki",
    });
    expect(
      screen.getByRole("link", { name: "controlPanel.visits.form.viewAllVisits" }),
    ).toHaveAttribute("href", "/hallinta/kaynnit");
  });

  it("shows the API error when creating a visit fails", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("create failed"));

    render(<VisitForm parks={parks} />);

    await userEvent.selectOptions(
      screen.getByLabelText(/controlPanel.visits.form.parkLabel/i),
      "pallas",
    );
    await userEvent.type(
      screen.getByLabelText(/controlPanel.visits.form.dateLabel/i),
      "2024-06-15",
    );
    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.submit/i }));

    expect(await screen.findByText("create failed")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("includes a created visit location override in the payload", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce({
      id: 42,
      visitedOn: "2024-06-15",
      route: null,
      excludeFromRoute: false,
      author: null,
      location: { lat: 68.1, lon: 24.9 },
      note: null,
      tripStopOrder: null,
      createdAt: "2024-06-15T00:00:00Z",
      updatedAt: "2024-06-15T00:00:00Z",
    });

    render(<VisitForm parks={parks} />);

    await userEvent.selectOptions(
      screen.getByLabelText(/controlPanel.visits.form.parkLabel/i),
      "pallas",
    );
    await userEvent.type(
      screen.getByLabelText(/controlPanel.visits.form.dateLabel/i),
      "2024-06-15",
    );
    await userEvent.clear(screen.getByLabelText(/controlPanel.visits.form.locationLatitudeLabel/i));
    await userEvent.type(
      screen.getByLabelText(/controlPanel.visits.form.locationLatitudeLabel/i),
      "68.1",
    );
    await userEvent.clear(
      screen.getByLabelText(/controlPanel.visits.form.locationLongitudeLabel/i),
    );
    await userEvent.type(
      screen.getByLabelText(/controlPanel.visits.form.locationLongitudeLabel/i),
      "24.9",
    );

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.submit/i }));

    expect(apiFetch).toHaveBeenCalledWith("/api/parks/pallas/visits", {
      method: "POST",
      body: JSON.stringify({
        visitedOn: "2024-06-15",
        route: null,
        author: null,
        location: { lat: 68.1, lon: 24.9 },
        note: null,
      }),
    });
  });

  it("shows a validation error when visit location coordinates are incomplete", async () => {
    render(<VisitForm parks={parks} />);

    await userEvent.selectOptions(
      screen.getByLabelText(/controlPanel.visits.form.parkLabel/i),
      "pallas",
    );
    await userEvent.type(
      screen.getByLabelText(/controlPanel.visits.form.dateLabel/i),
      "2024-06-15",
    );
    await userEvent.type(
      screen.getByLabelText(/controlPanel.visits.form.locationLatitudeLabel/i),
      "68.1",
    );

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.submit/i }));

    expect(
      await screen.findByText("controlPanel.visits.form.validation.locationInvalid"),
    ).toBeInTheDocument();
  });

  it("toggles markdown preview", async () => {
    render(<VisitForm parks={parks} />);

    const textarea = screen.getByPlaceholderText("controlPanel.visits.form.notePlaceholder");
    fireEvent.change(textarea, { target: { value: "# Hello" } });

    const previewButton = screen.getByText("controlPanel.visits.form.preview");
    fireEvent.click(previewButton);

    expect(screen.getByRole("heading", { name: "Hello" })).toBeInTheDocument();
  });

  it("returns from preview mode back to editable markdown text", async () => {
    render(<VisitForm parks={parks} />);

    const noteField = screen.getByPlaceholderText("controlPanel.visits.form.notePlaceholder");
    await userEvent.type(noteField, "Retkimuistiinpanot");

    await userEvent.click(screen.getByRole("button", { name: "controlPanel.visits.form.preview" }));
    await userEvent.click(screen.getByRole("button", { name: "controlPanel.visits.form.edit" }));

    expect(screen.getByPlaceholderText("controlPanel.visits.form.notePlaceholder")).toHaveValue(
      "Retkimuistiinpanot",
    );
  });

  it("does not delete when the user cancels the confirmation", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );

    render(<VisitForm parks={parks} visitToEdit={visitToEdit} />);

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.delete/i }));

    expect(apiFetch).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("returns to the visits list after deleting a visit", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<VisitForm parks={parks} visitToEdit={visitToEdit} />);

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.delete/i }));

    expect(apiFetch).toHaveBeenCalledWith("/api/visits/1", { method: "DELETE" });
    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({
      parkSlug: "pallas",
      tripSlug: "keski-suomen-kesaretki",
    });
    expect(mockPush).toHaveBeenCalledWith("/hallinta/kaynnit");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows the delete error and stays on the form when removing a visit fails", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("delete failed"));

    render(<VisitForm parks={parks} visitToEdit={visitToEdit} />);

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.delete/i }));

    expect(await screen.findByText("delete failed")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("disables the save button immediately after a successful edit", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    const { rerender } = render(<VisitForm parks={parks} visitToEdit={visitToEdit} />);

    const routeField = screen.getByLabelText(/controlPanel.visits.form.routeLabel/i);
    await userEvent.clear(routeField);
    await userEvent.type(routeField, "Hetta");

    const submitButton = screen.getByRole("button", { name: /controlPanel.visits.form.submit/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "controlPanel.visits.form.updateSuccess",
      );
    });

    expect(submitButton).toBeDisabled();
    expect(mockRefresh).toHaveBeenCalled();

    const updatedVisit = { ...visitToEdit, route: "Hetta" };
    rerender(<VisitForm parks={parks} visitToEdit={updatedVisit} />);

    expect(submitButton).toBeDisabled();
  });

  it("goes back to the previous page from the back action", async () => {
    render(<VisitForm parks={parks} />);

    fireEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.back/i }));

    expect(mockBack).toHaveBeenCalled();
  });
});
