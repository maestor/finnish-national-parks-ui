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
    mockApiFetch.mockReset();
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
  it("paginates photos, keeps the saved choice selected, and cancels without writing", async () => {
    const onClose = vi.fn();
    const second = {
      ...candidate,
      image: { ...candidate.image, id: 11, originalName: "other.jpg" },
      reference: { imageId: 11, source: "visit-image" as const },
      isPubliclyVisible: false,
    };
    mockApiFetch
      .mockResolvedValueOnce({ images: [candidate], nextOffset: 48 })
      .mockResolvedValueOnce({ images: [second], nextOffset: null });
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    render(
      <TripImagePicker
        initialSelection={candidate}
        open
        onClose={onClose}
        onSaved={vi.fn()}
        tripId={7}
      />,
    );
    const first = await screen.findByRole("button", { name: /featured.jpg/ });
    expect(first).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "loadMore" }));
    expect(await screen.findByRole("button", { name: /other.jpg/ })).toBeInTheDocument();
    expect(screen.getByText("unpublished")).toBeInTheDocument();
    expect(mockApiFetch).toHaveBeenLastCalledWith("/api/admin/trips/7/images?offset=48&limit=48");
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(opener).toHaveFocus();
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
    opener.remove();
  });

  it("retries failed loads and reports failed saves while keeping the choice", async () => {
    mockApiFetch
      .mockRejectedValueOnce(new Error("load"))
      .mockResolvedValueOnce({ images: [candidate], nextOffset: null })
      .mockRejectedValueOnce(new Error("save"));
    render(
      <TripImagePicker
        initialSelection={null}
        open
        onClose={vi.fn()}
        onSaved={vi.fn()}
        tripId={7}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("error");
    fireEvent.click(screen.getByRole("button", { name: "loadMore" }));
    const photo = await screen.findByRole("button", { name: /featured.jpg/ });
    fireEvent.click(photo);
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "save" })).toBeEnabled());
    expect(photo).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows an empty gallery and handles Escape without a save", async () => {
    mockApiFetch.mockResolvedValueOnce({ images: [], nextOffset: null });
    const onClose = vi.fn();
    render(
      <TripImagePicker
        initialSelection={null}
        open
        onClose={onClose}
        onSaved={vi.fn()}
        tripId={7}
      />,
    );
    expect(await screen.findByText("empty")).toBeInTheDocument();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(mockApiFetch).toHaveBeenCalledOnce();
  });

  it("locks closing during a pending save and restores focus when saved", async () => {
    let resolve!: (value: { featuredImage: TripImageCandidate }) => void;
    mockApiFetch
      .mockResolvedValueOnce({ images: [candidate], nextOffset: null })
      .mockReturnValueOnce(
        new Promise<{ featuredImage: TripImageCandidate }>((done) => {
          resolve = done;
        }),
      );
    const onClose = vi.fn();
    render(
      <TripImagePicker
        initialSelection={null}
        open
        onClose={onClose}
        onSaved={vi.fn()}
        tripId={7}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: /featured.jpg/ }));
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    expect(screen.getByRole("button", { name: "saving" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "close" }));
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(onClose).not.toHaveBeenCalled();
    resolve({ featuredImage: candidate });
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("discards an unsaved choice when the picker opens again", async () => {
    mockApiFetch.mockResolvedValue({ images: [candidate], nextOffset: null });
    const props = { initialSelection: null, onClose: vi.fn(), onSaved: vi.fn(), tripId: 7 };
    const { rerender } = render(<TripImagePicker {...props} open />);
    fireEvent.click(await screen.findByRole("button", { name: /featured.jpg/ }));
    expect(screen.getByRole("button", { name: "save" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    rerender(
      <SnackbarProvider>
        <TripImagePicker {...props} open={false} />
      </SnackbarProvider>,
    );
    rerender(
      <SnackbarProvider>
        <TripImagePicker {...props} open />
      </SnackbarProvider>,
    );
    expect(await screen.findByRole("button", { name: /featured.jpg/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled();
  });
  it("ignores an older gallery response after closing and reopening", async () => {
    let resolve!: (value: { images: TripImageCandidate[]; nextOffset: null }) => void;
    mockApiFetch
      .mockReturnValueOnce(
        new Promise<{ images: TripImageCandidate[]; nextOffset: null }>((done) => {
          resolve = done;
        }),
      )
      .mockResolvedValueOnce({ images: [], nextOffset: null });
    const props = { initialSelection: null, onClose: vi.fn(), onSaved: vi.fn(), tripId: 7 };
    const { rerender } = render(<TripImagePicker {...props} open />);
    rerender(
      <SnackbarProvider>
        <TripImagePicker {...props} open={false} />
      </SnackbarProvider>,
    );
    rerender(
      <SnackbarProvider>
        <TripImagePicker {...props} open />
      </SnackbarProvider>,
    );
    expect(await screen.findByText("empty")).toBeInTheDocument();
    resolve({ images: [candidate], nextOffset: null });
    await waitFor(() => expect(screen.getByText("empty")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /featured.jpg/ })).toBeNull();
  });

  it("does not show a late gallery error after the picker closes", async () => {
    let reject!: (error: Error) => void;
    mockApiFetch.mockReturnValueOnce(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    const props = { initialSelection: null, onClose: vi.fn(), onSaved: vi.fn(), tripId: 7 };
    const { rerender } = render(<TripImagePicker {...props} open />);
    rerender(
      <SnackbarProvider>
        <TripImagePicker {...props} open={false} />
      </SnackbarProvider>,
    );
    reject(new Error("late failure"));
    await Promise.resolve();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
