import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareImageFileForUpload } from "@/lib/image-upload";
import type { VisitImage } from "@/lib/parks";
import { TripStopImageSection } from "./trip-stop-image-section";

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

const createImage = (id: number): VisitImage => ({
  id,
  fullUrl: `https://example.com/full-${id}.jpg`,
  thumbUrl: `https://example.com/thumb-${id}.jpg`,
  fullWidth: 1920,
  fullHeight: 1080,
  thumbWidth: 400,
  thumbHeight: 225,
  originalName: `image-${id}.jpg`,
  displayOrder: id - 1,
  createdAt: "2024-06-15T10:00:00Z",
});

const existingImages = Array.from({ length: 5 }, (_, index) => createImage(index + 1));

describe("TripStopImageSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockDirectUploadFetch);
    vi.mocked(prepareImageFileForUpload).mockImplementation(async (file: File) => file);
    mockIsLocalImageUploadMode.mockReturnValue(true);
  });

  it("shows the stop image helper text and max image summary", () => {
    render(<TripStopImageSection stopId={10} images={existingImages} tripSlug="kesaretki" />);

    expect(screen.getByText("controlPanel.trips.assignments.stopImages.title")).toBeInTheDocument();
    expect(
      screen.getByText("controlPanel.trips.assignments.stopImages.description"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("controlPanel.trips.assignments.stopImages.maxImagesSummary"),
    ).toBeInTheDocument();
  });

  it("shows a max image warning when selection exceeds the remaining stop slots", async () => {
    const { container } = render(
      <TripStopImageSection stopId={10} images={existingImages} tripSlug="kesaretki" />,
    );

    const fileInput = container.querySelector('input[type="file"]');

    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error("Expected file input");
    }

    const firstFile = new File(["dummy"], "first.jpg", { type: "image/jpeg" });
    const secondFile = new File(["dummy"], "second.jpg", { type: "image/jpeg" });

    fireEvent.change(fileInput, { target: { files: [firstFile, secondFile] } });

    await waitFor(() => {
      expect(screen.getByText("controlPanel.visits.images.selectedCount")).toBeInTheDocument();
    });

    expect(
      screen.getByText("controlPanel.trips.assignments.stopImages.maxImagesReached"),
    ).toBeInTheDocument();
  });
});
