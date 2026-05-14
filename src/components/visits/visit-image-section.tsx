"use client";

import { Button } from "@/components/ui/button";
import { VisitImageGallery } from "@/components/visits/visit-image-gallery";
import { apiFetch } from "@/lib/api";
import type { VisitImage } from "@/lib/parks";
import { ArrowLeft, ArrowRight, Images, Trash2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface VisitImageSectionProps {
  visitId: number;
  images: VisitImage[];
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const VisitImageSection = ({ visitId, images }: VisitImageSectionProps) => {
  const t = useTranslations("controlPanel.visits.images");
  const router = useRouter();
  const [localImages, setLocalImages] = useState(images);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  useEffect(() => {
    return () => {
      for (const url of previews) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previews]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const validFiles: File[] = [];
    const errors: string[] = [];
    setActionError(null);
    setStatusMessage(null);

    for (const file of files) {
      if (ACCEPTED_TYPES.includes(file.type)) {
        validFiles.push(file);
      } else {
        errors.push(t("unsupportedType", { name: file.name }));
      }
    }

    if (errors.length > 0) {
      setUploadErrors((prev) => [...prev, ...errors]);
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }

    event.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setActionError(null);
    setStatusMessage(null);
    setUploadErrors([]);

    try {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append("images", file);
      }

      const response = await apiFetch<{
        images: VisitImage[];
        errors: { originalName: string; reason: string }[];
      }>(`/api/me/visits/${visitId}/images`, {
        method: "POST",
        body: formData,
      });

      for (const url of previews) {
        URL.revokeObjectURL(url);
      }
      setSelectedFiles([]);
      setPreviews([]);
      setLocalImages((prev) => [...prev, ...response.images]);

      if (response.errors.length > 0) {
        setUploadErrors(response.errors.map((e) => `${e.originalName}: ${e.reason}`));
      }

      if (response.images.length > 0) {
        setStatusMessage(t("uploadSuccess", { count: response.images.length }));
        router.refresh();
      }
    } catch (error) {
      setUploadErrors([error instanceof Error ? error.message : t("uploadFailed")]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!window.confirm(t("deleteConfirm"))) {
      return;
    }

    setActionError(null);
    setStatusMessage(null);
    setLocalImages((prev) => prev.filter((img) => img.id !== imageId));

    try {
      await apiFetch(`/api/me/visits/${visitId}/images/${imageId}`, {
        method: "DELETE",
      });
      setStatusMessage(t("deleteSuccess"));
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("deleteFailed"));
      setLocalImages(images);
    }
  };

  const handleReorder = async (imageId: number, direction: "left" | "right") => {
    const currentIndex = localImages.findIndex((image) => image.id === imageId);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= localImages.length) {
      return;
    }

    const previousImages = localImages;
    const nextImages = [...localImages];
    const [movedImage] = nextImages.splice(currentIndex, 1);
    nextImages.splice(targetIndex, 0, movedImage);

    setActionError(null);
    setStatusMessage(null);
    setIsReordering(true);
    setLocalImages(nextImages);

    try {
      await apiFetch(`/api/me/visits/${visitId}/images/reorder`, {
        method: "PATCH",
        body: JSON.stringify({
          imageIds: nextImages.map((image) => image.id),
        }),
      });
      setStatusMessage(t("reorderSuccess"));
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("reorderFailed"));
      setLocalImages(previousImages);
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <section className="mt-8 max-w-xl space-y-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Images className="h-5 w-5 text-primary" aria-hidden="true" />
        {t("title")}
      </h2>

      {localImages.length > 0 && (
        <VisitImageGallery
          images={localImages}
          dialogLabel={t("title")}
          thumbnailLayout="grid"
          renderThumbnailOverlay={(image, index) => (
            <>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/55 via-transparent to-black/30 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" />
              <div className="absolute inset-0">
                <div className="absolute right-2 top-2 flex gap-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(image.id);
                    }}
                    className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-destructive/90 text-white shadow-sm transition-colors hover:bg-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label={t("deleteImage")}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                {localImages.length > 1 && (
                  <div className="absolute inset-x-2 bottom-2 flex justify-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0 || isReordering}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleReorder(image.id, "left");
                      }}
                      className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={t("moveLeft")}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={index === localImages.length - 1 || isReordering}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleReorder(image.id, "right");
                      }}
                      className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={t("moveRight")}
                    >
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        />
      )}

      {actionError && (
        <p
          className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {actionError}
        </p>
      )}

      {statusMessage && (
        <output
          aria-live="polite"
          className="block rounded-lg border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200"
        >
          {statusMessage}
        </output>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t("selectFiles")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="sr-only"
            aria-label={t("selectFiles")}
          />
          {selectedFiles.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {t("selectedCount", { count: selectedFiles.length })}
            </span>
          )}
        </div>

        {previews.length > 0 && (
          <div className="flex gap-3 overflow-x-auto px-0.5 pb-2 pt-0.5">
            {previews.map((url, index) => (
              <div
                key={url}
                className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl border bg-muted shadow-sm sm:w-32 md:w-36"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t("removeFile")}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedFiles.length > 0 && (
          <Button type="button" onClick={handleUpload} disabled={isUploading}>
            {isUploading ? t("uploading") : t("upload")}
          </Button>
        )}

        {uploadErrors.length > 0 && (
          <ul
            className="space-y-1 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {uploadErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
