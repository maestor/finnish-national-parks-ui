import { apiFetch } from "@/lib/api";
import type { VisitImage } from "@/lib/parks";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisitImageSection } from "./visit-image-section";

const mockRefresh = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
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

describe("VisitImageSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it("renders existing images", () => {
    render(<VisitImageSection visitId={10} images={images} />);

    expect(screen.getByText("controlPanel.visits.images.title")).toBeInTheDocument();
    const imgs = screen.getAllByRole("presentation");
    expect(imgs.length).toBe(2);
  });

  it("deletes an image after confirmation", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<VisitImageSection visitId={10} images={images} />);

    const deleteButtons = screen.getAllByRole("button", {
      name: "controlPanel.visits.images.deleteImage",
    });
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith("controlPanel.visits.images.deleteConfirm");
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/me/visits/10/images/1", {
        method: "DELETE",
      });
    });
    expect(mockRefresh).toHaveBeenCalled();
    expect(screen.getByText("controlPanel.visits.images.deleteSuccess")).toBeInTheDocument();
  });

  it("does not delete an image when confirmation is cancelled", () => {
    window.confirm = vi.fn(() => false);

    render(<VisitImageSection visitId={10} images={images} />);

    const deleteButtons = screen.getAllByRole("button", {
      name: "controlPanel.visits.images.deleteImage",
    });
    fireEvent.click(deleteButtons[0]);

    expect(apiFetch).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("restores the image and shows an error if deleting fails", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("delete failed"));

    render(<VisitImageSection visitId={10} images={images} />);

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

  it("reorders an image to the left", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<VisitImageSection visitId={10} images={images} />);

    const moveLeftButtons = screen.getAllByRole("button", {
      name: "controlPanel.visits.images.moveLeft",
    });
    fireEvent.click(moveLeftButtons[1]);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/me/visits/10/images/reorder", {
        method: "PATCH",
        body: JSON.stringify({
          imageIds: [2, 1],
        }),
      });
    });
    expect(mockRefresh).toHaveBeenCalled();
    expect(screen.getByText("controlPanel.visits.images.reorderSuccess")).toBeInTheDocument();
  });

  it("shows upload controls after selecting files", async () => {
    const { container } = render(<VisitImageSection visitId={10} images={[]} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText("controlPanel.visits.images.selectedCount")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "controlPanel.visits.images.upload" }),
    ).toBeInTheDocument();
  });

  it("removes a selected file before upload", async () => {
    const { container } = render(<VisitImageSection visitId={10} images={[]} />);

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

  it("uploads files and refreshes the page", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      images: [
        {
          id: 3,
          fullUrl: "https://example.com/full-3.jpg",
          thumbUrl: "https://example.com/thumb-3.jpg",
          fullWidth: 1920,
          fullHeight: 1080,
          thumbWidth: 400,
          thumbHeight: 225,
          originalName: "test.jpg",
          displayOrder: 0,
          createdAt: "2024-06-15T10:10:00Z",
        },
      ],
      errors: [],
    });

    const { container } = render(<VisitImageSection visitId={10} images={[]} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    const uploadButton = screen.getByRole("button", { name: "controlPanel.visits.images.upload" });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/me/visits/10/images", {
        method: "POST",
        body: expect.any(FormData),
      });
    });
    expect(mockRefresh).toHaveBeenCalled();
    expect(screen.getByText("controlPanel.visits.images.uploadSuccess")).toBeInTheDocument();
  });

  it("shows upload errors for unsupported file types", async () => {
    const { container } = render(<VisitImageSection visitId={10} images={[]} />);

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

    const { container } = render(<VisitImageSection visitId={10} images={[]} />);

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

    const { container } = render(<VisitImageSection visitId={10} images={[]} />);

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
