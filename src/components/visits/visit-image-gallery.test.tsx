import type { VisitImage } from "@/lib/parks";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VisitImageGallery } from "./visit-image-gallery";

const scrollByMock = vi.fn();

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
    Object.defineProperty(HTMLElement.prototype, "scrollBy", {
      configurable: true,
      value: scrollByMock,
    });
    scrollByMock.mockClear();
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
    fireEvent.click(firstThumbnail);

    expect(screen.getByRole("dialog", { name: "imageGallery.dialogLabel" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "imageGallery.activeImage" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "imageGallery.close" })).toHaveFocus();
  });

  it("disables native browser dragging for thumbnail images", () => {
    render(<VisitImageGallery images={images} />);

    const [firstThumbnailImage] = screen.getAllByRole("presentation");

    expect(firstThumbnailImage).toHaveAttribute("draggable", "false");
  });

  it("closes the lightbox from the close button", async () => {
    render(<VisitImageGallery images={images} />);

    const [firstThumbnail] = screen.getAllByRole("button", { name: /imageGallery.open/i });
    fireEvent.click(firstThumbnail);
    fireEvent.click(screen.getByRole("button", { name: "imageGallery.close" }));

    expect(
      screen.queryByRole("dialog", { name: "imageGallery.dialogLabel" }),
    ).not.toBeInTheDocument();
    expect(firstThumbnail).toHaveFocus();
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

  it("scrolls the thumbnail rail when the rail controls are clicked", () => {
    render(<VisitImageGallery images={images} />);

    fireEvent.click(screen.getByRole("button", { name: "imageGallery.scrollPrevious" }));
    fireEvent.click(screen.getByRole("button", { name: "imageGallery.scrollNext" }));

    expect(scrollByMock).toHaveBeenNthCalledWith(1, {
      left: -320,
      behavior: "smooth",
    });
    expect(scrollByMock).toHaveBeenNthCalledWith(2, {
      left: 320,
      behavior: "smooth",
    });
  });

  it("supports previous and next navigation inside the lightbox", () => {
    render(<VisitImageGallery images={images} />);

    const [firstThumbnail] = screen.getAllByRole("button", { name: /imageGallery.open/i });
    fireEvent.click(firstThumbnail);

    expect(screen.getByText("imageGallery.position")).toHaveTextContent("imageGallery.position");
    expect(screen.getByRole("img", { name: "imageGallery.activeImage" })).toHaveAttribute(
      "src",
      "https://example.com/full-1.jpg",
    );

    fireEvent.click(screen.getByRole("button", { name: "imageGallery.next" }));

    expect(screen.getByRole("img", { name: "imageGallery.activeImage" })).toHaveAttribute(
      "src",
      "https://example.com/full-2.jpg",
    );

    fireEvent.click(screen.getByRole("button", { name: "imageGallery.previous" }));

    expect(screen.getByRole("img", { name: "imageGallery.activeImage" })).toHaveAttribute(
      "src",
      "https://example.com/full-1.jpg",
    );
  });

  it("supports keyboard navigation and escape in the lightbox", () => {
    render(<VisitImageGallery images={images} />);

    const [firstThumbnail] = screen.getAllByRole("button", { name: /imageGallery.open/i });
    fireEvent.click(firstThumbnail);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(screen.getByRole("img", { name: "imageGallery.activeImage" })).toHaveAttribute(
      "src",
      "https://example.com/full-2.jpg",
    );

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    expect(screen.getByRole("img", { name: "imageGallery.activeImage" })).toHaveAttribute(
      "src",
      "https://example.com/full-1.jpg",
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      screen.queryByRole("dialog", { name: "imageGallery.dialogLabel" }),
    ).not.toBeInTheDocument();
  });

  it("supports swipe navigation inside the lightbox", () => {
    render(<VisitImageGallery images={images} />);

    const [firstThumbnail] = screen.getAllByRole("button", { name: /imageGallery.open/i });
    fireEvent.click(firstThumbnail);

    const activeImage = screen.getByRole("img", { name: "imageGallery.activeImage" });

    fireEvent.touchStart(activeImage, {
      changedTouches: [{ clientX: 220, clientY: 100 }],
    });
    fireEvent.touchEnd(activeImage, {
      changedTouches: [{ clientX: 80, clientY: 110 }],
    });

    expect(screen.getByRole("img", { name: "imageGallery.activeImage" })).toHaveAttribute(
      "src",
      "https://example.com/full-2.jpg",
    );
  });
});
