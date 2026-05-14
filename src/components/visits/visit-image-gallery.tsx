"use client";

import { cn } from "@/lib/cn";
import type { VisitImage } from "@/lib/parks";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

interface VisitImageGalleryProps {
  images: VisitImage[];
  className?: string;
  dialogLabel?: string;
  centerThumbnailsWhenStatic?: boolean;
  thumbnailLayout?: "carousel" | "grid";
  renderThumbnailOverlay?: (image: VisitImage, index: number) => ReactNode;
}

const THUMBNAIL_SCROLL_AMOUNT = 320;

export const VisitImageGallery = ({
  images,
  className,
  dialogLabel,
  centerThumbnailsWhenStatic = false,
  thumbnailLayout = "carousel",
  renderThumbnailOverlay,
}: VisitImageGalleryProps) => {
  const t = useTranslations("imageGallery");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [canScrollThumbnails, setCanScrollThumbnails] = useState(false);
  const hasMultipleImages = images.length > 1;
  const usesCarouselLayout = thumbnailLayout === "carousel";
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const activeImage =
    activeIndex === null
      ? null
      : {
          image: images[activeIndex],
          index: activeIndex,
        };

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
        return;
      }

      if (!hasMultipleImages) {
        return;
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => {
          if (current === null) {
            return null;
          }
          return current === 0 ? images.length - 1 : current - 1;
        });
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) => {
          if (current === null) {
            return null;
          }
          return current === images.length - 1 ? 0 : current + 1;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, hasMultipleImages, images.length]);

  useEffect(() => {
    if (!usesCarouselLayout) {
      setCanScrollThumbnails(false);
      return;
    }

    const node = thumbnailsRef.current;
    if (!node) {
      return;
    }

    const updateScrollableState = () => {
      setCanScrollThumbnails(node.scrollWidth - node.clientWidth > 8);
    };

    updateScrollableState();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateScrollableState);
      return () => {
        window.removeEventListener("resize", updateScrollableState);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateScrollableState();
    });

    resizeObserver.observe(node);
    window.addEventListener("resize", updateScrollableState);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollableState);
    };
  }, [usesCarouselLayout]);

  const showPreviousImage = () => {
    setActiveIndex((current) => {
      if (current === null) {
        return null;
      }
      return current === 0 ? images.length - 1 : current - 1;
    });
  };

  const showNextImage = () => {
    setActiveIndex((current) => {
      if (current === null) {
        return null;
      }
      return current === images.length - 1 ? 0 : current + 1;
    });
  };

  const scrollThumbnails = (direction: "previous" | "next") => {
    const node = thumbnailsRef.current;
    if (!node) {
      return;
    }

    node.scrollBy({
      left: direction === "previous" ? -THUMBNAIL_SCROLL_AMOUNT : THUMBNAIL_SCROLL_AMOUNT,
      behavior: "smooth",
    });
  };

  return (
    <>
      <div className={cn("space-y-3", className)}>
        <div className="relative">
          {usesCarouselLayout && canScrollThumbnails && (
            <>
              <button
                type="button"
                onClick={() => scrollThumbnails("previous")}
                className="absolute left-2 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("scrollPrevious")}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scrollThumbnails("next")}
                className="absolute right-2 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("scrollNext")}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}

          <div
            ref={thumbnailsRef}
            className={cn(
              usesCarouselLayout
                ? "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pt-0.5"
                : "flex flex-wrap gap-3",
              usesCarouselLayout &&
                (canScrollThumbnails || !centerThumbnailsWhenStatic
                  ? "justify-start px-0.5"
                  : "justify-center px-0.5"),
              usesCarouselLayout && canScrollThumbnails && "px-10",
            )}
          >
            {images.map((image, index) => (
              <div
                key={image.id}
                className={cn(
                  "group relative",
                  usesCarouselLayout
                    ? "w-28 shrink-0 snap-start sm:w-32 md:w-36"
                    : "w-28 shrink-0 sm:w-32",
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className="block w-full overflow-hidden rounded-xl border bg-muted text-left shadow-sm transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={t("open", { index: index + 1 })}
                >
                  <img
                    src={image.thumbUrl}
                    alt=""
                    className="aspect-square h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
                {renderThumbnailOverlay && (
                  <div className="pointer-events-none absolute inset-0">
                    {renderThumbnailOverlay(image, index)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {activeImage && (
        <dialog
          open
          className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none overflow-hidden border-none bg-transparent p-0"
          aria-label={dialogLabel ?? t("dialogLabel")}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setActiveIndex(null)}
            aria-label={t("closeBackdrop")}
          />
          <div className="relative flex h-full w-full items-center justify-center p-4 sm:p-8">
            {hasMultipleImages && (
              <button
                type="button"
                onClick={showPreviousImage}
                className="absolute left-4 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-background/90 text-foreground shadow-lg backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={t("previous")}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            )}

            <div className="relative flex max-h-full w-full max-w-6xl flex-col items-center gap-4">
              <div className="relative flex max-h-[82vh] w-full items-center justify-center rounded-2xl border border-white/10 bg-black/35 p-3 shadow-2xl sm:p-4">
                <img
                  src={activeImage.image.fullUrl}
                  alt={t("activeImage", { index: activeImage.index + 1 })}
                  className="max-h-[74vh] w-auto max-w-full rounded-xl object-contain"
                />
                <button
                  type="button"
                  onClick={() => setActiveIndex(null)}
                  className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-lg backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t("close")}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <p className="rounded-full bg-black/55 px-3 py-1 text-center text-sm text-white/85">
                {t("position", { current: activeImage.index + 1, total: images.length })}
              </p>
            </div>

            {hasMultipleImages && (
              <button
                type="button"
                onClick={showNextImage}
                className="absolute right-4 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-background/90 text-foreground shadow-lg backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={t("next")}
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </dialog>
      )}
    </>
  );
};
