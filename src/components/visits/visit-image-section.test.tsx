import { apiFetch } from "@/lib/api";
import { prepareImageFileForUpload } from "@/lib/image-upload";
import type { VisitImage } from "@/lib/parks";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisitImageSection } from "./visit-image-section";

const mockRefresh = vi.fn();
const { mockDirectUploadFetch, mockIsLocalImageUploadMode, mockRevalidatePublicCache } = vi.hoisted(
  () => ({
    mockDirectUploadFetch: vi.fn(),
    mockIsLocalImageUploadMode: vi.fn(() => true),
    mockRevalidatePublicCache: vi.fn(async () => true),
  }),
);

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/image-upload", () => ({
  prepareImageFileForUpload: vi.fn(async (file: File) => file),
  isLocalImageUploadMode: mockIsLocalImageUploadMode,
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
    vi.stubGlobal("fetch", mockDirectUploadFetch);
    vi.mocked(prepareImageFileForUpload).mockImplementation(async (file: File) => file);
    mockIsLocalImageUploadMode.mockReturnValue(true);
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

  it("navigates inside the lightbox without reordering the saved images", () => {
    const { container } = render(
      <VisitImageSection visitId={10} images={images} parkSlug="pallas" />,
    );

    const [firstThumbnail] = screen.getAllByRole("button", {
      name: /imageGallery.open/i,
    });
    fireEvent.click(firstThumbnail);

    expect(screen.getByRole("button", { name: "imageGallery.close" })).toHaveFocus();

    fireEvent.keyDown(document.activeElement ?? window, { key: "ArrowRight" });

    expect(screen.getByRole("img", { name: "imageGallery.activeImage" })).toHaveAttribute(
      "src",
      "https://example.com/full-2.jpg",
    );
    expect(getSavedImageOrder(container)).toEqual(["1", "2"]);
    expect(
      screen.queryByRole("button", { name: "controlPanel.visits.images.saveOrder" }),
    ).not.toBeInTheDocument();
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

  it("shows upload controls after selecting files", async () => {
    const { container } = render(<VisitImageSection visitId={10} images={[]} parkSlug="pallas" />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("controlPanel.visits.images.selectedCount")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "controlPanel.visits.images.upload" }),
    ).toBeInTheDocument();
  });

  it("removes a selected file before upload", async () => {
    const { container } = render(<VisitImageSection visitId={10} images={[]} parkSlug="pallas" />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "controlPanel.visits.images.removeFile" }),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "controlPanel.visits.images.removeFile" }));

    expect(screen.queryByText("controlPanel.visits.images.selectedCount")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "controlPanel.visits.images.upload" }),
    ).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("localhost uploads files in the reordered preview order via multipart form data", async () => {
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
    await waitFor(() => {
      expect(screen.getByText("controlPanel.visits.images.selectedCount")).toBeInTheDocument();
    });

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
    expect(mockDirectUploadFetch).not.toHaveBeenCalled();
  });

  it("uploads preprocessed files instead of the original files", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      images: [],
      errors: [],
    });
    vi.mocked(prepareImageFileForUpload).mockImplementation(async (file) => {
      return new File([`optimized:${file.name}`], `optimized-${file.name}`, {
        type: "image/webp",
      });
    });

    const { container } = render(<VisitImageSection visitId={10} images={[]} parkSlug="pallas" />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const originalFile = new File(["dummy"], "large.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [originalFile] } });

    await waitFor(() => {
      expect(screen.getByText("controlPanel.visits.images.selectedCount")).toBeInTheDocument();
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
    const uploadedFiles = formData.getAll("images") as File[];

    expect(uploadedFiles).toHaveLength(1);
    expect(uploadedFiles[0]?.name).toBe("optimized-large.jpg");
    expect(uploadedFiles[0]?.type).toBe("image/webp");
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

  it("shows a preprocessing error when a selected image cannot be optimized", async () => {
    vi.mocked(prepareImageFileForUpload).mockRejectedValueOnce(new Error("optimize failed"));

    const { container } = render(<VisitImageSection visitId={10} images={[]} parkSlug="pallas" />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "broken.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "controlPanel.visits.images.preprocessFailed",
      );
    });
    expect(
      screen.queryByRole("button", { name: "controlPanel.visits.images.upload" }),
    ).not.toBeInTheDocument();
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
    await waitFor(() => {
      expect(screen.getByText("controlPanel.visits.images.selectedCount")).toBeInTheDocument();
    });

    const uploadButton = screen.getByRole("button", { name: "controlPanel.visits.images.upload" });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("big.jpg: File too large");
    });
  });

  it("uses upload-url, direct PUT, and complete in the reordered pending-file order outside localhost", async () => {
    mockIsLocalImageUploadMode.mockReturnValue(false);
    mockDirectUploadFetch
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        uploadUrl: "https://uploads.example.com/second",
        key: "visit/10/second",
        method: "PUT",
        headers: {
          "content-type": "image/jpeg",
        },
        expiresAt: "2026-05-26T10:00:00.000Z",
      })
      .mockResolvedValueOnce({
        image: {
          id: 11,
          fullUrl: "https://example.com/full-11.jpg",
          thumbUrl: "https://example.com/thumb-11.jpg",
          fullWidth: 1920,
          fullHeight: 1080,
          thumbWidth: 400,
          thumbHeight: 225,
          originalName: "second.jpg",
          displayOrder: 0,
          createdAt: "2024-06-15T10:00:00Z",
        },
      })
      .mockResolvedValueOnce({
        uploadUrl: "https://uploads.example.com/first",
        key: "visit/10/first",
        method: "PUT",
        headers: {
          "content-type": "image/jpeg",
        },
        expiresAt: "2026-05-26T10:00:01.000Z",
      })
      .mockResolvedValueOnce({
        image: {
          id: 12,
          fullUrl: "https://example.com/full-12.jpg",
          thumbUrl: "https://example.com/thumb-12.jpg",
          fullWidth: 1920,
          fullHeight: 1080,
          thumbWidth: 400,
          thumbHeight: 225,
          originalName: "first.jpg",
          displayOrder: 1,
          createdAt: "2024-06-15T10:00:01Z",
        },
      });
    const user = userEvent.setup();

    const { container } = render(<VisitImageSection visitId={10} images={[]} parkSlug="pallas" />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const firstFile = new File(["dummy-1"], "first.jpg", { type: "image/jpeg" });
    const secondFile = new File(["dummy-2"], "second.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [firstFile, secondFile] } });
    await waitFor(() => {
      expect(screen.getByText("controlPanel.visits.images.selectedCount")).toBeInTheDocument();
    });

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
    fireEvent.click(screen.getByRole("button", { name: "controlPanel.visits.images.upload" }));

    await waitFor(() => {
      expect(mockDirectUploadFetch).toHaveBeenCalledTimes(2);
    });

    expect(vi.mocked(apiFetch).mock.calls).toEqual([
      [
        "/api/visits/10/images/upload-url",
        {
          method: "POST",
          body: JSON.stringify({
            contentType: "image/jpeg",
            fileSizeBytes: secondFile.size,
            originalName: "second.jpg",
          }),
        },
      ],
      [
        "/api/visits/10/images/complete",
        {
          method: "POST",
          body: JSON.stringify({
            key: "visit/10/second",
            originalName: "second.jpg",
          }),
        },
      ],
      [
        "/api/visits/10/images/upload-url",
        {
          method: "POST",
          body: JSON.stringify({
            contentType: "image/jpeg",
            fileSizeBytes: firstFile.size,
            originalName: "first.jpg",
          }),
        },
      ],
      [
        "/api/visits/10/images/complete",
        {
          method: "POST",
          body: JSON.stringify({
            key: "visit/10/first",
            originalName: "first.jpg",
          }),
        },
      ],
    ]);
    expect(mockDirectUploadFetch).toHaveBeenNthCalledWith(1, "https://uploads.example.com/second", {
      method: "PUT",
      headers: {
        "content-type": "image/jpeg",
      },
      body: secondFile,
    });
    expect(mockDirectUploadFetch).toHaveBeenNthCalledWith(2, "https://uploads.example.com/first", {
      method: "PUT",
      headers: {
        "content-type": "image/jpeg",
      },
      body: firstFile,
    });
    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "pallas" });
    expect(mockRefresh).toHaveBeenCalled();
    expect(screen.getByText("controlPanel.visits.images.uploadSuccess")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "controlPanel.visits.images.upload" }),
    ).not.toBeInTheDocument();
  });

  it("surfaces production upload failures and keeps failed files pending for retry", async () => {
    mockIsLocalImageUploadMode.mockReturnValue(false);
    mockDirectUploadFetch
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response("signature expired", { status: 403 }));
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        uploadUrl: "https://uploads.example.com/first",
        key: "visit/10/first",
        method: "PUT",
        headers: {
          "content-type": "image/jpeg",
        },
        expiresAt: "2026-05-26T10:00:00.000Z",
      })
      .mockResolvedValueOnce({
        image: {
          id: 11,
          fullUrl: "https://example.com/full-11.jpg",
          thumbUrl: "https://example.com/thumb-11.jpg",
          fullWidth: 1920,
          fullHeight: 1080,
          thumbWidth: 400,
          thumbHeight: 225,
          originalName: "first.jpg",
          displayOrder: 0,
          createdAt: "2024-06-15T10:00:00Z",
        },
      })
      .mockResolvedValueOnce({
        uploadUrl: "https://uploads.example.com/second",
        key: "visit/10/second",
        method: "PUT",
        headers: {
          "content-type": "image/jpeg",
        },
        expiresAt: "2026-05-26T10:00:01.000Z",
      });

    const { container } = render(<VisitImageSection visitId={10} images={[]} parkSlug="pallas" />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const firstFile = new File(["dummy-1"], "first.jpg", { type: "image/jpeg" });
    const secondFile = new File(["dummy-2"], "second.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [firstFile, secondFile] } });
    await waitFor(() => {
      expect(screen.getByText("controlPanel.visits.images.selectedCount")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "controlPanel.visits.images.upload" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("second.jpg: signature expired");
    });

    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "pallas" });
    expect(mockRefresh).toHaveBeenCalled();
    expect(screen.getByText("controlPanel.visits.images.uploadSuccess")).toBeInTheDocument();
    expect(screen.getByText("controlPanel.visits.images.selectedCount")).toBeInTheDocument();
    expect(getPendingImageOrder(container)).toHaveLength(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("shows an upload error when the upload request fails", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("upload failed"));

    const { container } = render(<VisitImageSection visitId={10} images={[]} parkSlug="pallas" />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByText("controlPanel.visits.images.selectedCount")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "controlPanel.visits.images.upload" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("upload failed");
    });

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("appends newly uploaded images at the end when the server returns them out of order", async () => {
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
          originalName: "new.jpg",
          displayOrder: 0,
          createdAt: "2024-06-15T10:10:00Z",
        },
      ],
      errors: [],
    });

    const { container, rerender } = render(
      <VisitImageSection visitId={10} images={images} parkSlug="pallas" />,
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "new.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByText("controlPanel.visits.images.selectedCount")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "controlPanel.visits.images.upload" }));

    await waitFor(() => {
      expect(screen.getByText("controlPanel.visits.images.uploadSuccess")).toBeInTheDocument();
    });

    expect(getSavedImageOrder(container)).toEqual(["1", "2", "3"]);

    // Simulate router.refresh() returning the new image in 2nd position from server
    const serverReorderedImages: VisitImage[] = [
      images[0],
      {
        id: 3,
        fullUrl: "https://example.com/full-3.jpg",
        thumbUrl: "https://example.com/thumb-3.jpg",
        fullWidth: 1920,
        fullHeight: 1080,
        thumbWidth: 400,
        thumbHeight: 225,
        originalName: "new.jpg",
        displayOrder: 0,
        createdAt: "2024-06-15T10:10:00Z",
      },
      images[1],
    ];

    rerender(<VisitImageSection visitId={10} images={serverReorderedImages} parkSlug="pallas" />);

    expect(getSavedImageOrder(container)).toEqual(["1", "2", "3"]);
  });
});
