"use client";

import { cn } from "@/lib/cn";
import type { VisitImage } from "@/lib/parks";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ButtonHTMLAttributes, HTMLAttributes, MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface VisitImageGalleryProps {
  images: VisitImage[];
  className?: string;
  dialogLabel?: string;
  centerThumbnailsWhenStatic?: boolean;
  thumbnailLayout?: "carousel" | "grid";
  getThumbnailProps?: (image: VisitImage, index: number) => HTMLAttributes<HTMLDivElement>;
  getThumbnailButtonProps?: (
    image: VisitImage,
    index: number,
  ) => ButtonHTMLAttributes<HTMLButtonElement>;
  onThumbnailClick?: (
    image: VisitImage,
    index: number,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
  renderThumbnailOverlay?: (image: VisitImage, index: number) => ReactNode;
}

const THUMBNAIL_SCROLL_AMOUNT = 320;
const SWIPE_THRESHOLD = 48;

export const VisitImageGallery = ({
  images,
  className,
  dialogLabel,
  centerThumbnailsWhenStatic = false,
  thumbnailLayout = "carousel",
  getThumbnailProps,
  getThumbnailButtonProps,
  onThumbnailClick,
  renderThumbnailOverlay,
}: VisitImageGalleryProps) => {
  const t = useTranslations("imageGallery");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [canScrollThumbnails, setCanScrollThumbnails] = useState(false);
  const hasMultipleImages = images.length > 1;
  const usesCarouselLayout = thumbnailLayout === "carousel";
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeImage =
    activeIndex === null
      ? null
      : {
          image: images[activeIndex],
          index: activeIndex,
        };

  useEffect(() => {
    if (activeIndex === null) {
      previouslyFocusedElementRef.current?.focus();
      previouslyFocusedElementRef.current = null;
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

    closeButtonRef.current?.focus();
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, hasMultipleImages, images.length]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [activeIndex]);

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

  const handleLightboxTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLightboxTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (!hasMultipleImages || !touchStartRef.current) {
      touchStartRef.current = null;
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      touchStartRef.current = null;
      return;
    }

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaY) > Math.abs(deltaX)) {
      return;
    }

    if (deltaX < 0) {
      showNextImage();
      return;
    }

    showPreviousImage();
  };

  const lightbox =
    activeImage && typeof document !== "undefined"
      ? createPortal(
          <dialog
            open
            aria-label={dialogLabel ?? t("dialogLabel")}
            aria-modal="true"
            className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none overflow-hidden border-none bg-transparent p-0"
          >
            <button
              type="button"
              className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.92),rgba(2,6,23,0.98))] backdrop-blur-md"
              onClick={() => setActiveIndex(null)}
              aria-label={t("closeBackdrop")}
            />
            <div className="relative flex h-full w-full flex-col overflow-hidden">
              <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-6">
                <p className="hidden rounded-full border border-white/15 bg-white/10 px-3 py-1 text-center text-sm text-white/88 shadow-[0_18px_38px_rgba(15,23,42,0.28)] backdrop-blur-md sm:inline-flex">
                  {t("position", { current: activeImage.index + 1, total: images.length })}
                </p>
                <div className="flex-1 sm:hidden" />
                <button
                  type="button"
                  ref={closeButtonRef}
                  onClick={() => setActiveIndex(null)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-[0_18px_38px_rgba(15,23,42,0.28)] backdrop-blur-md transition-colors hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t("close")}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="relative flex min-h-0 flex-1 items-center justify-center px-0 pt-[calc(env(safe-area-inset-top)+4.5rem)] sm:px-6 sm:py-24">
                {hasMultipleImages && (
                  <button
                    type="button"
                    onClick={showPreviousImage}
                    className="absolute left-6 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-[0_20px_40px_rgba(15,23,42,0.34)] backdrop-blur-md transition-colors hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
                    aria-label={t("previous")}
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}

                <div className="flex h-full w-full items-center justify-center overflow-hidden sm:mx-auto sm:max-h-[calc(100dvh-8rem)] sm:max-w-6xl sm:rounded-[2rem] sm:border sm:border-white/10 sm:bg-white/[0.06] sm:p-4 sm:shadow-[0_32px_70px_rgba(2,6,23,0.4)] sm:backdrop-blur-xl">
                  <img
                    src={activeImage.image.fullUrl}
                    alt={t("activeImage", { index: activeImage.index + 1 })}
                    className="max-h-[calc(100dvh-7rem)] w-auto max-w-full object-contain select-none sm:max-h-[calc(100dvh-11rem)] sm:rounded-[1.4rem]"
                    onTouchStart={handleLightboxTouchStart}
                    onTouchEnd={handleLightboxTouchEnd}
                  />
                </div>
              </div>

              {hasMultipleImages && (
                <button
                  type="button"
                  onClick={showNextImage}
                  className="absolute right-6 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-[0_20px_40px_rgba(15,23,42,0.34)] backdrop-blur-md transition-colors hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
                  aria-label={t("next")}
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              )}

              <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-3 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:hidden">
                {hasMultipleImages && (
                  <button
                    type="button"
                    onClick={showPreviousImage}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-[0_18px_38px_rgba(15,23,42,0.28)] backdrop-blur-md transition-colors hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("previous")}
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}

                <p className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-center text-sm text-white/88 shadow-[0_18px_38px_rgba(15,23,42,0.28)] backdrop-blur-md">
                  {t("position", { current: activeImage.index + 1, total: images.length })}
                </p>

                {hasMultipleImages && (
                  <button
                    type="button"
                    onClick={showNextImage}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-[0_18px_38px_rgba(15,23,42,0.28)] backdrop-blur-md transition-colors hover:bg-white/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={t("next")}
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </dialog>,
          document.body,
        )
      : null;

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
            {images.map((image, index) => {
              const thumbnailProps = getThumbnailProps?.(image, index);
              const thumbnailButtonProps = getThumbnailButtonProps?.(image, index);

              return (
                <div
                  key={image.id}
                  {...thumbnailProps}
                  className={cn(
                    "group relative",
                    usesCarouselLayout
                      ? "w-28 shrink-0 snap-start sm:w-32 md:w-36"
                      : "w-28 shrink-0 sm:w-32",
                    thumbnailProps?.className,
                  )}
                >
                  <button
                    type="button"
                    {...thumbnailButtonProps}
                    onClick={(event) => {
                      thumbnailButtonProps?.onClick?.(event);
                      if (event.defaultPrevented) {
                        return;
                      }

                      onThumbnailClick?.(image, index, event);
                      if (event.defaultPrevented) {
                        return;
                      }

                      previouslyFocusedElementRef.current = event.currentTarget;
                      setActiveIndex(index);
                    }}
                    className={cn(
                      "block w-full overflow-hidden rounded-xl border bg-muted text-left shadow-sm transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      thumbnailButtonProps?.className,
                    )}
                    aria-label={t("open", { index: index + 1 })}
                  >
                    <img
                      src={image.thumbUrl}
                      alt=""
                      className="aspect-square h-full w-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                  </button>
                  {renderThumbnailOverlay && (
                    <div className="pointer-events-none absolute inset-0">
                      {renderThumbnailOverlay(image, index)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {lightbox}
    </>
  );
};
