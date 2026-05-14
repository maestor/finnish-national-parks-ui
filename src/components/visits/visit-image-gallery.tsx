"use client";

import { cn } from "@/lib/cn";
import type { VisitImage } from "@/lib/parks";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface VisitImageGalleryProps {
  images: VisitImage[];
  className?: string;
  dialogLabel?: string;
}

export const VisitImageGallery = ({ images, className, dialogLabel }: VisitImageGalleryProps) => {
  const t = useTranslations("imageGallery");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const hasMultipleImages = images.length > 1;
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

  return (
    <>
      <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", className)}>
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className="overflow-hidden rounded-lg border bg-muted text-left transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={t("open", { index: index + 1 })}
          >
            <img
              src={image.thumbUrl}
              alt=""
              className="aspect-square h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {activeImage && (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          aria-label={dialogLabel ?? t("dialogLabel")}
        >
          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            className="absolute right-4 top-4 inline-flex items-center justify-center rounded-full bg-background/10 p-2 text-white transition-colors hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          {hasMultipleImages && (
            <button
              type="button"
              onClick={showPreviousImage}
              className="absolute left-4 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full bg-background/10 p-2 text-white transition-colors hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={t("previous")}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
          )}

          <div className="flex max-h-full max-w-5xl flex-col gap-3">
            <img
              src={activeImage.image.fullUrl}
              alt={t("activeImage", { index: activeImage.index + 1 })}
              className="max-h-[80vh] rounded-lg object-contain"
            />
            <p className="text-center text-sm text-white/80">
              {t("position", { current: activeImage.index + 1, total: images.length })}
            </p>
          </div>

          {hasMultipleImages && (
            <button
              type="button"
              onClick={showNextImage}
              className="absolute right-4 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full bg-background/10 p-2 text-white transition-colors hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={t("next")}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </dialog>
      )}
    </>
  );
};
