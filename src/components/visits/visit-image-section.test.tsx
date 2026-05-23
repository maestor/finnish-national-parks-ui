import { apiFetch } from "@/lib/api";
import type { VisitImage } from "@/lib/parks";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisitImageSection } from "./visit-image-section";

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
  useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
  usePathname: () => "/",
}));

Object.defineProperty(globalThis, "URL", {
  value: {
    createObjectURL: vi.fn(() => "blob:mock-url"),
    revokeObjectURL: vi.fn(),
  },
  writable: true,
});

const images: VisitImage[] = [
  {
    id: 1,
    fullUrl: "https://example.com/full-1.jpg",
    thumbUrl: "https://example.com/thumb-1.jpg",
    fullWidth: 1920,
    fullHeight: 1080,
    thumbWidth: 400,
    thumbHeight: 225,
    originalName: "eka.jpg",
    displayOrder: 0,
    createdAt: "2024-06-15T10:00:00Z",
  },
  {
    id: 2,
    fullUrl: "https://example.com/full-2.jpg",
    thumbUrl: "https://example.com/thumb-2.jpg",
    fullWidth: 1920,
    fullHeight: 1080,
    thumbWidth: 400,
    thumbHeight: 225,
    originalName: "toka.jpg",
    displayOrder: 1,
    createdAt: "2024-06-15T10:05:00Z",
  },
];

const getSavedImageOrder = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-saved-image-id]")).map((element) =>
    element.getAttribute("data-saved-image-id"),
  );

const getPendingImageOrder = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-pending-image-id]")).map((element) =>
    element.getAttribute("data-pending-image-id"),
  );

const mockElementFromPoint = (element: Element | null) => {
  const elementFromPoint = vi.fn(() => element);

  Object.defineProperty(document, "elementFromPoint", {
    value: elementFromPoint,
    configurable: true,
  });

  return elementFromPoint;
};

describe("VisitImageSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it("renders existing images", () => {
    render(<VisitImageSection visitId={10} images={images} parkSlug="pallas" />);

    expect(screen.getByText("controlPanel.visits.images.title")).toBeInTheDocument();
    expect(screen.getAllByRole("presentation")).toHaveLength(2);
  });

  it("renders a custom section title when provided", () => {
    render(
      <VisitImageSection
        visitId={10}
        images={images}
        parkSlug="pallas"
        sectionTitle="controlPanel.visits.editVisit.manageImages"
      />,
    );

    expect(screen.getByText("controlPanel.visits.editVisit.manageImages")).toBeInTheDocument();
  });

  it("deletes an image after confirmation", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<VisitImageSection visitId={10} images={images} parkSlug="pallas" />);

    const deleteButtons = screen.getAllByRole("button", {
      name: "controlPanel.visits.images.deleteImage",
    });
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith("controlPanel.visits.images.deleteConfirm");
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/visits/10/images/1", {
        method: "DELETE",
      });
    });
    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "pallas" });
    expect(mockRefresh).toHaveBeenCalled();
    expect(screen.getByText("controlPanel.visits.images.deleteSuccess")).toBeInTheDocument();
  });

  it("does not delete an image when confirmation is cancelled", () => {
    window.confirm = vi.fn(() => false);

    render(<VisitImageSection visitId={10} images={images} parkSlug="pallas" />);

    const deleteButtons = screen.getAllByRole("button", {
      name: "controlPanel.visits.images.deleteImage",
    });
    fireEvent.click(deleteButtons[0]);

    expect(apiFetch).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("restores the image and shows an error if deleting fails", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("delete failed"));

    render(<VisitImageSection visitId={10} images={images} parkSlug="pallas" />);

    const deleteButtons = screen.getAllByRole("button", {
      name: "controlPanel.visits.images.deleteImage",
    });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("delete failed");
    });

    expect(mockRefresh).not.toHaveBeenCalled();
    expect(screen.getAllByRole("presentation")).toHaveLength(2);
  });

  it("reorders saved images locally and saves only after confirmation", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    const { container } = render(
      <VisitImageSection visitId={10} images={images} parkSlug="pallas" />,
    );
    const targetThumbnail = container.querySelector('[data-saved-image-id="2"]') as Element;
    mockElementFromPoint(targetThumbnail);

    const thumbnailButtons = screen.getAllByRole("button", {
      name: /imageGallery.open/i,
    });
    await user.pointer([
      { target: thumbnailButtons[0], keys: "[MouseLeft>]", coords: { x: 10, y: 10 } },
      { target: thumbnailButtons[0], coords: { x: 30, y: 30 } },
    ]);

    await waitFor(() => {
      expect(getSavedImageOrder(container)).toEqual(["2", "1"]);
    });
    expect(apiFetch).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "controlPanel.visits.images.saveOrder" }),
    ).toBeInTheDocument();

    await user.pointer([{ target: thumbnailButtons[0], keys: "[/MouseLeft]" }]);

    await waitFor(() => {
      expect(getSavedImageOrder(container)).toEqual(["2", "1"]);
    });
    expect(apiFetch).not.toHaveBeenCalled();

    const saveButton = screen.getByRole("button", {
      name: "controlPanel.visits.images.saveOrder",
    });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/visits/10/images/reorder", {
        method: "PATCH",
        body: JSON.stringify({
          imageIds: [2, 1],
        }),
      });
    });

    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "pallas" });
    expect(mockRefresh).toHaveBeenCalled();
    expect(screen.getByText("controlPanel.visits.images.reorderSuccess")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "controlPanel.visits.images.saveOrder" }),
    ).not.toBeInTheDocument();
  });

  it("still opens the saved-image preview on a normal click", () => {
    render(<VisitImageSection visitId={10} images={images} parkSlug="pallas" />);

    const thumbnailButtons = screen.getAllByRole("button", {
      name: /imageGallery.open/i,
    });
    fireEvent.click(thumbnailButtons[0]);

    expect(
      screen.getByRole("dialog", { name: "controlPanel.visits.images.title" }),
    ).toBeInTheDocument();
  });

  it("supports keyboard reordering for saved images", () => {
    const { container } = render(
      <VisitImageSection visitId={10} images={images} parkSlug="pallas" />,
    );

    const thumbnailButtons = screen.getAllByRole("button", {
      name: /imageGallery.open/i,
    });
    fireEvent.keyDown(thumbnailButtons[1], { key: "ArrowLeft" });

    expect(getSavedImageOrder(container)).toEqual(["2", "1"]);
    expect(
      screen.getByRole("button", { name: "controlPanel.visits.images.saveOrder" }),
    ).toBeInTheDocument();
  });

  it("restores the original saved image order before saving", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <VisitImageSection visitId={10} images={images} parkSlug="pallas" />,
    );

    fireEvent.keyDown(screen.getAllByRole("button", { name: /imageGallery.open/i })[1], {
      key: "ArrowLeft",
    });

    expect(getSavedImageOrder(container)).toEqual(["2", "1"]);

    await user.click(
      screen.getByRole("button", { name: "controlPanel.visits.images.restoreOrder" }),
    );

    expect(getSavedImageOrder(container)).toEqual(["1", "2"]);
    expect(
      screen.queryByRole("button", { name: "controlPanel.visits.images.saveOrder" }),
    ).not.toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("shows upload controls after selecting files", () => {
    const { container } = render(<VisitImageSection visitId={10} images={[]} parkSlug="pallas" />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText("controlPanel.visits.images.selectedCount")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "controlPanel.visits.images.upload" }),
    ).toBeInTheDocument();
  });

  it("removes a selected file before upload", () => {
    const { container } = render(<VisitImageSection visitId={10} images={[]} parkSlug="pallas" />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "controlPanel.visits.images.removeFile" }));

    expect(screen.queryByText("controlPanel.visits.images.selectedCount")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "controlPanel.visits.images.upload" }),
    ).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("uploads files in the reordered preview order", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      images: [],
      errors: [],
    });
    const user = userEvent.setup();

    const { container } = render(<VisitImageSection visitId={10} images={[]} parkSlug="pallas" />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const firstFile = new File(["dummy"], "first.jpg", { type: "image/jpeg" });
    const secondFile = new File(["dummy"], "second.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [firstFile, secondFile] } });

    const initialPendingOrder = getPendingImageOrder(container);
    const secondPendingId = initialPendingOrder[1];
    const firstPendingId = initialPendingOrder[0];
    const firstPreview = container.querySelector(
      `[data-pending-image-id="${firstPendingId}"]`,
    ) as Element;
    mockElementFromPoint(firstPreview);

    const reorderButtons = screen.getAllByRole("button", {
      name: "controlPanel.visits.images.reorderPendingImage",
    });
    await user.pointer([
      { target: reorderButtons[1], keys: "[MouseLeft>]", coords: { x: 10, y: 10 } },
      { target: reorderButtons[1], coords: { x: 20, y: 20 } },
    ]);

    await waitFor(() => {
      expect(getPendingImageOrder(container)).toEqual([secondPendingId, firstPendingId]);
    });

    await user.pointer([{ target: reorderButtons[1], keys: "[/MouseLeft]" }]);

    await waitFor(() => {
      expect(getPendingImageOrder(container)).toEqual([secondPendingId, firstPendingId]);
    });

    fireEvent.click(screen.getByRole("button", { name: "controlPanel.visits.images.upload" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/visits/10/images", {
        method: "POST",
        body: expect.any(FormData),
      });
    });

    const requestInit = vi.mocked(apiFetch).mock.calls[0]?.[1];
    const formData = requestInit?.body as FormData;
    const uploadedFileNames = formData.getAll("images").map((file) => (file as File).name);

    expect(uploadedFileNames).toEqual(["second.jpg", "first.jpg"]);
  });

  it("shows upload errors for unsupported file types", () => {
    const { container } = render(<VisitImageSection visitId={10} images={[]} parkSlug="pallas" />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "test.txt", { type: "text/plain" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "controlPanel.visits.images.unsupportedType",
    );
  });

  it("shows per-file errors from the backend", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      images: [],
      errors: [{ originalName: "big.jpg", reason: "File too large" }],
    });

    const { container } = render(<VisitImageSection visitId={10} images={[]} parkSlug="pallas" />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "big.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadButton = screen.getByRole("button", { name: "controlPanel.visits.images.upload" });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("big.jpg: File too large");
    });
  });

  it("shows an upload error when the upload request fails", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("upload failed"));

    const { container } = render(<VisitImageSection visitId={10} images={[]} parkSlug="pallas" />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "controlPanel.visits.images.upload" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("upload failed");
    });

    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
