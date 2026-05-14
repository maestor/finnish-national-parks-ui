import type { Park } from "@/lib/parks";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VisitForm } from "./visit-form";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const parks = [
  { slug: "pallas", name: "Pallas-Yllästunturi" },
  { slug: "nuuksio", name: "Nuuksio" },
] as Park[];

describe("VisitForm", () => {
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
  });

  it("shows validation errors when required fields are empty", async () => {
    render(<VisitForm parks={parks} />);

    const submitButton = screen.getByRole("button", { name: /controlPanel.visits.form.submit/i });
    await userEvent.click(submitButton);

    expect(
      screen.getByText("controlPanel.visits.form.validation.parkRequired"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("controlPanel.visits.form.validation.dateRequired"),
    ).toBeInTheDocument();
  });

  it("renders edit mode with prefilled values, read-only park and delete button", () => {
    const visitToEdit = {
      id: 1,
      parkSlug: "pallas",
      parkName: "Pallas-Yllästunturi",
      visitedOn: "2024-06-15",
      route: "Pallas-Yllästunturin reitti",
      author: "Maija Meikäläinen",
      note: "Great hike",
      createdAt: "2024-06-15T00:00:00Z",
      updatedAt: "2024-06-15T00:00:00Z",
    };

    render(<VisitForm parks={parks} visitToEdit={visitToEdit} />);

    expect(screen.getByText("Pallas-Yllästunturi")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2024-06-15")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Pallas-Yllästunturin reitti")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Maija Meikäläinen")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Great hike")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /controlPanel.visits.form.delete/i }),
    ).toBeInTheDocument();
  });

  it("toggles markdown preview", async () => {
    render(<VisitForm parks={parks} />);

    const textarea = screen.getByPlaceholderText("controlPanel.visits.form.notePlaceholder");
    await userEvent.type(textarea, "# Hello");

    const previewButton = screen.getByText("controlPanel.visits.form.preview");
    await userEvent.click(previewButton);

    expect(screen.getByRole("heading", { name: "Hello" })).toBeInTheDocument();
  });
});
