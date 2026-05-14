import type { VisitImage } from "@/lib/parks";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { VisitImageGallery } from "./visit-image-gallery";

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

describe("VisitImageGallery", () => {
  it("opens a lightbox from a thumbnail", async () => {
    render(<VisitImageGallery images={images} />);

    const [firstThumbnail] = screen.getAllByRole("button", { name: /imageGallery.open/i });
    await userEvent.click(firstThumbnail);

    expect(screen.getByRole("dialog", { name: "imageGallery.dialogLabel" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "imageGallery.activeImage" })).toBeInTheDocument();
  });
});
