import { fireEvent, render as renderTestingLibrary, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SnackbarProvider } from "@/components/providers/snackbar-provider";
import type { TripImageCandidate } from "@/lib/trips";
import { TripImagePicker } from "./trip-image-picker";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));

vi.mock("@/lib/api", () => ({ apiFetch: mockApiFetch }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const render = (ui: Parameters<typeof renderTestingLibrary>[0]) =>
  renderTestingLibrary(<SnackbarProvider>{ui}</SnackbarProvider>);

const candidate: TripImageCandidate = {
  image: {
    createdAt: "2026-06-07T09:00:00Z",
    displayOrder: 0,
    fullHeight: 1000,
    fullUrl: "https://example.com/full.jpg",
    fullWidth: 1500,
    id: 10,
    originalName: "featured.jpg",
    thumbHeight: 200,
    thumbUrl: "https://example.com/thumb.jpg",
    thumbWidth: 300,
  },
  isPubliclyVisible: true,
  reference: { imageId: 10, source: "visit-image" },
  sourceId: 4,
  sourceLabel: "Kansallispuisto",
  visitedOn: "2026-06-07",
};

describe("TripImagePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
      this.open = false;
    });
  });

  it("shows the saved state, marks a newly selected image, and saves it", async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    mockApiFetch
      .mockResolvedValueOnce({ images: [candidate], nextOffset: null })
      .mockResolvedValueOnce({ featuredImage: candidate });
    render(
      <TripImagePicker
        initialSelection={null}
        onClose={onClose}
        onSaved={onSaved}
        open
        tripId={7}
      />,
    );

    const saveButton = await screen.findByRole("button", {
      name: "save",
    });
    expect(saveButton).toBeDisabled();

    const imageButton = await screen.findByRole("button", {
      name: /Kansallispuisto, 2026-06-07, featured\.jpg/,
    });
    fireEvent.click(imageButton);

    expect(imageButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("selected")).toBeInTheDocument();
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(candidate));
    expect(onClose).toHaveBeenCalled();
  });

  it("reports loading failures", async () => {
    mockApiFetch.mockRejectedValue(new Error("network"));
    render(
      <TripImagePicker
        initialSelection={null}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        open
        tripId={8}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("error");
  });
});
