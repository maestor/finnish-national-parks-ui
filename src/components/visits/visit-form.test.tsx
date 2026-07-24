import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Park } from "@/lib/parks";
import type { Trip } from "@/lib/trips";
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
  trip: {
    id: 7,
    name: "Keski-Suomen kesaretki",
    slug: "keski-suomen-kesaretki",
  },
  tripStopOrder: 1,
  visitedOn: "2024-06-15",
  route: "Pallas-Yllästunturin reitti",
  author: "Maija Meikäläinen",
  note: "Great hike",
  createdAt: "2024-06-15T00:00:00Z",
  updatedAt: "2024-06-15T00:00:00Z",
  images: [],
};

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
      displayName: "Jyvaskyla",
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
      author: null,
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
        tripId: null,
        visitedOn: "2024-06-15",
        route: null,
        author: null,
        note: null,
      }),
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/hallinta/kaynnit/42/muokkaa?created=1");
    });
    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "pallas" });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("revalidates both the park page and the selected trip page when creating an assigned visit", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce({
      id: 43,
      visitedOn: "2024-06-15",
      route: null,
      author: null,
      note: null,
      tripStopOrder: 1,
      createdAt: "2024-06-15T00:00:00Z",
      updatedAt: "2024-06-15T00:00:00Z",
    });

    render(<VisitForm parks={parks} trips={trips} defaultTripId="7" />);

    await userEvent.selectOptions(
      screen.getByLabelText(/controlPanel.visits.form.parkLabel/i),
      "pallas",
    );
    await userEvent.type(
      screen.getByLabelText(/controlPanel.visits.form.dateLabel/i),
      "2024-06-15",
    );
    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.submit/i }));

    await waitFor(() => {
      expect(mockRevalidatePublicCache).toHaveBeenNthCalledWith(1, {
        parkSlug: "pallas",
        tripSlug: "keski-suomen-kesaretki",
      });
    });
  });

  it("keeps the create submit button pending until navigation leaves the page", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce({
      id: 42,
      visitedOn: "2024-06-15",
      route: null,
      author: null,
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
    render(<VisitForm parks={parks} trips={trips} />);

    expect(screen.getByLabelText(/controlPanel.visits.form.parkLabel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/controlPanel.visits.form.tripLabel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/controlPanel.visits.form.dateLabel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/controlPanel.visits.form.routeLabel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/controlPanel.visits.form.authorLabel/i)).toBeInTheDocument();
    expect(screen.getByText(/controlPanel.visits.form.noteLabel/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /controlPanel.visits.form.submit/i }),
    ).toBeInTheDocument();
  });

  it("uses the default park when creating a visit from a park page", () => {
    render(<VisitForm parks={parks} defaultParkSlug="nuuksio" />);

    expect(screen.getByLabelText(/controlPanel.visits.form.parkLabel/i)).toHaveValue("nuuksio");
  });

  it("uses the default trip when creating a visit from a trip shortcut", () => {
    render(<VisitForm parks={parks} trips={trips} defaultTripId="8" />);

    expect(screen.getByLabelText(/controlPanel.visits.form.tripLabel/i)).toHaveValue("8");
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
    render(<VisitForm parks={parks} trips={trips} visitToEdit={visitToEdit} />);

    expect(screen.getByText("Pallas-Yllästunturi")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2024-06-15")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Pallas-Yllästunturin reitti")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Maija Meikäläinen")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Great hike")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /controlPanel.visits.form.delete/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/controlPanel.visits.form.tripLabel/i)).toHaveValue("7");
  });

  it("disables the edit save button until something changes", async () => {
    render(<VisitForm parks={parks} trips={trips} visitToEdit={visitToEdit} />);

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

    render(<VisitForm parks={parks} trips={trips} visitToEdit={visitToEdit} />);

    await userEvent.clear(screen.getByLabelText(/controlPanel.visits.form.routeLabel/i));
    await userEvent.type(screen.getByLabelText(/controlPanel.visits.form.routeLabel/i), "Hetta");

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.submit/i }));

    expect(apiFetch).toHaveBeenCalledWith("/api/visits/1", {
      method: "PATCH",
      body: JSON.stringify({
        tripId: 7,
        visitedOn: "2024-06-15",
        route: "Hetta",
        author: "Maija Meikäläinen",
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

  it("submits the selected trip assignment when creating a visit", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce({
      id: 42,
      trip: null,
      visitedOn: "2024-06-15",
      route: null,
      author: null,
      note: null,
      tripStopOrder: null,
      createdAt: "2024-06-15T00:00:00Z",
      updatedAt: "2024-06-15T00:00:00Z",
    });

    render(<VisitForm parks={parks} trips={trips} />);

    await userEvent.selectOptions(
      screen.getByLabelText(/controlPanel.visits.form.parkLabel/i),
      "pallas",
    );
    await userEvent.selectOptions(
      screen.getByLabelText(/controlPanel.visits.form.tripLabel/i),
      "8",
    );
    await userEvent.type(
      screen.getByLabelText(/controlPanel.visits.form.dateLabel/i),
      "2024-06-15",
    );

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.submit/i }));

    expect(apiFetch).toHaveBeenCalledWith("/api/parks/pallas/visits", {
      method: "POST",
      body: JSON.stringify({
        tripId: 8,
        visitedOn: "2024-06-15",
        route: null,
        author: null,
        note: null,
      }),
    });
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

    render(<VisitForm parks={parks} trips={trips} visitToEdit={visitToEdit} />);

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.delete/i }));

    expect(apiFetch).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("returns to the visits list after deleting a visit", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<VisitForm parks={parks} trips={trips} visitToEdit={visitToEdit} />);

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.delete/i }));

    expect(apiFetch).toHaveBeenCalledWith("/api/visits/1", { method: "DELETE" });
    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({
      parkSlug: "pallas",
      tripSlug: "keski-suomen-kesaretki",
    });
    expect(mockPush).toHaveBeenCalledWith("/hallinta/kaynnit");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("revalidates both the old and new trip pages when moving a visit to another trip", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<VisitForm parks={parks} trips={trips} visitToEdit={visitToEdit} />);

    await userEvent.selectOptions(
      screen.getByLabelText(/controlPanel.visits.form.tripLabel/i),
      "8",
    );
    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.submit/i }));

    await waitFor(() => {
      expect(mockRevalidatePublicCache).toHaveBeenNthCalledWith(1, {
        parkSlug: "pallas",
        tripSlug: "keski-suomen-kesaretki",
      });
    });
    expect(mockRevalidatePublicCache).toHaveBeenNthCalledWith(2, {
      parkSlug: null,
      tripSlug: "syysloman-rengasreitti",
    });
  });

  it("shows the delete error and stays on the form when removing a visit fails", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("delete failed"));

    render(<VisitForm parks={parks} trips={trips} visitToEdit={visitToEdit} />);

    await userEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.delete/i }));

    expect(await screen.findByText("delete failed")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("disables the save button immediately after a successful edit", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    const { rerender } = render(
      <VisitForm parks={parks} trips={trips} visitToEdit={visitToEdit} />,
    );

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
    rerender(<VisitForm parks={parks} trips={trips} visitToEdit={updatedVisit} />);

    expect(submitButton).toBeDisabled();
  });

  it("goes back to the previous page from the back action", async () => {
    render(<VisitForm parks={parks} />);

    fireEvent.click(screen.getByRole("button", { name: /controlPanel.visits.form.back/i }));

    expect(mockBack).toHaveBeenCalled();
  });
});
