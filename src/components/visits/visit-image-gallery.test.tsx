import type { VisitImage } from "@/lib/parks";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 200,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get: () => 500,
    });
  });

  afterEach(() => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 0,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get: () => 0,
    });
  });

  it("renders thumbnail rail controls for multiple images", () => {
    render(<VisitImageGallery images={images} />);

    expect(screen.getByRole("button", { name: "imageGallery.scrollPrevious" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "imageGallery.scrollNext" })).toBeInTheDocument();
  });

  it("opens a lightbox from a thumbnail", async () => {
    render(<VisitImageGallery images={images} />);

    const [firstThumbnail] = screen.getAllByRole("button", { name: /imageGallery.open/i });
    await userEvent.click(firstThumbnail);

    expect(screen.getByRole("dialog", { name: "imageGallery.dialogLabel" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "imageGallery.activeImage" })).toBeInTheDocument();
  });

  it("closes the lightbox from the close button", async () => {
    render(<VisitImageGallery images={images} />);

    const [firstThumbnail] = screen.getAllByRole("button", { name: /imageGallery.open/i });
    await userEvent.click(firstThumbnail);
    await userEvent.click(screen.getByRole("button", { name: "imageGallery.close" }));

    expect(
      screen.queryByRole("dialog", { name: "imageGallery.dialogLabel" }),
    ).not.toBeInTheDocument();
  });

  it("hides rail controls when thumbnails do not overflow", () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get: () => 500,
    });

    render(<VisitImageGallery images={images} />);

    expect(
      screen.queryByRole("button", { name: "imageGallery.scrollPrevious" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "imageGallery.scrollNext" }),
    ).not.toBeInTheDocument();
  });

  it("keeps static thumbnails left aligned by default", () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get: () => 500,
    });

    const { container } = render(<VisitImageGallery images={images} />);
    const rail = container.querySelector('[class*="snap-mandatory"]');

    expect(rail).toHaveClass("justify-start");
    expect(rail).not.toHaveClass("justify-center");
  });

  it("can center static thumbnails when requested", () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get: () => 500,
    });

    const { container } = render(<VisitImageGallery images={images} centerThumbnailsWhenStatic />);
    const rail = container.querySelector('[class*="snap-mandatory"]');

    expect(rail).toHaveClass("justify-center");
    expect(rail).not.toHaveClass("justify-start");
  });

  it("renders a wrapped fixed-size layout without rail controls when requested", () => {
    const { container } = render(<VisitImageGallery images={images} thumbnailLayout="grid" />);
    const gallery = container.querySelector(".flex-wrap");
    const thumbnails = container.querySelectorAll(".group.relative");

    expect(gallery).toHaveClass("flex");
    expect(gallery).toHaveClass("flex-wrap");
    expect(thumbnails[0]).toHaveClass("w-28");
    expect(thumbnails[0]).toHaveClass("sm:w-32");
    expect(
      screen.queryByRole("button", { name: "imageGallery.scrollPrevious" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "imageGallery.scrollNext" }),
    ).not.toBeInTheDocument();
  });
});
