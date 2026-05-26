"use client";

import { Button } from "@/components/ui/button";
import { VisitImageGallery } from "@/components/visits/visit-image-gallery";
import { apiFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";
import { cn } from "@/lib/cn";
import { isLocalImageUploadMode, prepareImageFileForUpload } from "@/lib/image-upload";
import type { VisitImage } from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";
import { Images, Trash2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ChangeEvent, KeyboardEvent, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";

interface VisitImageSectionProps {
  visitId: number;
  images: VisitImage[];
  parkSlug: string;
  sectionTitle?: string;
}

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface ActiveDrag {
  collection: "saved" | "pending";
  itemId: string;
  pointerId: number;
  startX: number;
  startY: number;
  isDragging: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DRAG_START_DISTANCE = 6;

type VisitImageUploadResponse =
  paths["/api/visits/{id}/images"]["post"]["responses"][201]["content"]["application/json"];
type VisitImageUploadPlanRequest = NonNullable<
  paths["/api/visits/{id}/images/upload-url"]["post"]["requestBody"]
>["content"]["application/json"];
type VisitImageUploadPlanResponse =
  paths["/api/visits/{id}/images/upload-url"]["post"]["responses"][201]["content"]["application/json"];
type VisitImageUploadCompleteRequest = NonNullable<
  paths["/api/visits/{id}/images/complete"]["post"]["requestBody"]
>["content"]["application/json"];
type VisitImageUploadCompleteResponse =
  paths["/api/visits/{id}/images/complete"]["post"]["responses"][201]["content"]["application/json"];

const getItemId = (item: { id: number | string }) => String(item.id);

const reorderItems = <T extends { id: number | string }>(
  items: T[],
  activeId: string,
  overId: string,
) => {
  const activeIndex = items.findIndex((item) => getItemId(item) === activeId);
  const overIndex = items.findIndex((item) => getItemId(item) === overId);

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(activeIndex, 1);
  nextItems.splice(overIndex, 0, movedItem);
  return nextItems;
};

const ordersMatch = (left: string[], right: string[]) =>
  left.length === right.length && left.every((itemId, index) => itemId === right[index]);

const getDropTargetId = (
  collection: ActiveDrag["collection"],
  clientX: number,
  clientY: number,
) => {
  const selector = collection === "saved" ? "[data-saved-image-id]" : "[data-pending-image-id]";
  const attribute = collection === "saved" ? "data-saved-image-id" : "data-pending-image-id";
  const target = document.elementFromPoint(clientX, clientY)?.closest(selector);
  return target?.getAttribute(attribute) ?? null;
};

const getPendingUploadError = (fileName: string, message: string) => `${fileName}: ${message}`;

const getDirectUploadFailureMessage = async (response: Response, fallbackMessage: string) => {
  const responseBody = await response.text().catch(() => "");
  const trimmedResponseBody = responseBody.trim();

  if (trimmedResponseBody) {
    return trimmedResponseBody;
  }

  return response.status > 0 ? `${fallbackMessage} (${response.status})` : fallbackMessage;
};

export const VisitImageSection = ({
  visitId,
  images,
  parkSlug,
  sectionTitle,
}: VisitImageSectionProps) => {
  const t = useTranslations("controlPanel.visits.images");
  const router = useRouter();
  const [localImages, setLocalImages] = useState(images);
  const [savedImageOrder, setSavedImageOrder] = useState(images.map((image) => String(image.id)));
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const activeDragRef = useRef<ActiveDrag | null>(null);
  const dragOverIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImageIdRef = useRef(0);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const suppressSavedThumbnailOpenRef = useRef<string | null>(null);

  useEffect(() => {
    setLocalImages(images);
    setSavedImageOrder(images.map((image) => String(image.id)));
  }, [images]);

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => {
    return () => {
      for (const pendingImage of pendingImagesRef.current) {
        URL.revokeObjectURL(pendingImage.previewUrl);
      }
    };
  }, []);

  const hasUnsavedImageOrder = !ordersMatch(
    savedImageOrder,
    localImages.map((image) => String(image.id)),
  );

  const moveSavedImage = (activeId: string, overId: string) => {
    setActionError(null);
    setStatusMessage(null);
    setLocalImages((currentImages) => reorderItems(currentImages, activeId, overId));
  };

  const movePendingImage = (activeId: string, overId: string) => {
    setActionError(null);
    setStatusMessage(null);
    setPendingImages((currentImages) => reorderItems(currentImages, activeId, overId));
  };

  const moveSavedImageByStep = (imageId: string, step: number) => {
    const currentIndex = localImages.findIndex((image) => String(image.id) === imageId);
    const targetImage = localImages[currentIndex + step];

    if (currentIndex === -1 || !targetImage) {
      return;
    }

    moveSavedImage(imageId, String(targetImage.id));
  };

  const movePendingImageByStep = (imageId: string, step: number) => {
    const currentIndex = pendingImages.findIndex((image) => image.id === imageId);
    const targetImage = pendingImages[currentIndex + step];

    if (currentIndex === -1 || !targetImage) {
      return;
    }

    movePendingImage(imageId, targetImage.id);
  };

  const handleDragStart =
    (collection: ActiveDrag["collection"], itemId: string) =>
    (event: PointerEvent<HTMLButtonElement>) => {
      const nextDrag = {
        collection,
        itemId,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        isDragging: false,
      } satisfies ActiveDrag;

      event.currentTarget.setPointerCapture?.(event.pointerId);
      activeDragRef.current = nextDrag;
      setActiveDrag(nextDrag);
      dragOverIdRef.current = itemId;
      setDragOverId(itemId);
      setActionError(null);
      setStatusMessage(null);
    };

  const handleDragMove = (event: PointerEvent<HTMLButtonElement>) => {
    const currentDrag = activeDragRef.current;

    if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
      return;
    }

    const distanceX = event.clientX - currentDrag.startX;
    const distanceY = event.clientY - currentDrag.startY;
    const didCrossThreshold =
      Math.hypot(distanceX, distanceY) >= DRAG_START_DISTANCE || currentDrag.isDragging;

    if (!didCrossThreshold) {
      return;
    }

    if (!currentDrag.isDragging) {
      const nextDrag = {
        ...currentDrag,
        isDragging: true,
      } satisfies ActiveDrag;

      activeDragRef.current = nextDrag;
      setActiveDrag((currentState) =>
        currentState
          ? {
              ...currentState,
              isDragging: true,
            }
          : null,
      );
    }

    event.preventDefault();
    const previousTargetId = dragOverIdRef.current;
    const targetId =
      getDropTargetId(currentDrag.collection, event.clientX, event.clientY) ?? currentDrag.itemId;
    dragOverIdRef.current = targetId;
    setDragOverId(dragOverIdRef.current);

    if (targetId !== currentDrag.itemId && targetId !== previousTargetId) {
      if (currentDrag.collection === "saved") {
        moveSavedImage(currentDrag.itemId, targetId);
      } else {
        movePendingImage(currentDrag.itemId, targetId);
      }
    }
  };

  const finishDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const currentDrag = activeDragRef.current;

    if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
      return;
    }

    const distanceX = event.clientX - currentDrag.startX;
    const distanceY = event.clientY - currentDrag.startY;
    const didDrag =
      Math.hypot(distanceX, distanceY) >= DRAG_START_DISTANCE || currentDrag.isDragging;

    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (didDrag) {
      event.preventDefault();
      event.stopPropagation();

      if (currentDrag.collection === "saved") {
        suppressSavedThumbnailOpenRef.current = currentDrag.itemId;
      }
    }

    activeDragRef.current = null;
    setActiveDrag(null);
    dragOverIdRef.current = null;
    setDragOverId(null);
  };

  const cancelDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const currentDrag = activeDragRef.current;

    if (!currentDrag || currentDrag.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    activeDragRef.current = null;
    setActiveDrag(null);
    dragOverIdRef.current = null;
    setDragOverId(null);
  };

  const handleSavedKeyDown = (imageId: string) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      moveSavedImageByStep(imageId, -1);
    }

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      moveSavedImageByStep(imageId, 1);
    }
  };

  const handlePendingKeyDown = (imageId: string) => (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      movePendingImageByStep(imageId, -1);
    }

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      movePendingImageByStep(imageId, 1);
    }
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const validFiles: PendingImage[] = [];
    const errors: string[] = [];
    setActionError(null);
    setStatusMessage(null);
    setUploadErrors([]);
    setIsPreparingImages(true);

    try {
      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          errors.push(t("unsupportedType", { name: file.name }));
          continue;
        }

        try {
          const preparedFile = await prepareImageFileForUpload(file);
          pendingImageIdRef.current += 1;
          validFiles.push({
            id: `pending-image-${pendingImageIdRef.current}`,
            file: preparedFile,
            previewUrl: URL.createObjectURL(preparedFile),
          });
        } catch {
          errors.push(t("preprocessFailed", { name: file.name }));
        }
      }
    } finally {
      setIsPreparingImages(false);
      event.target.value = "";
    }

    if (errors.length > 0) {
      setUploadErrors((currentErrors) => [...currentErrors, ...errors]);
    }

    if (validFiles.length > 0) {
      setPendingImages((currentImages) => [...currentImages, ...validFiles]);
    }
  };

  const handleRemoveFile = (pendingImageId: string) => {
    const pendingImage = pendingImages.find((image) => image.id === pendingImageId);

    if (!pendingImage) {
      return;
    }

    URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImages((currentImages) =>
      currentImages.filter((image) => image.id !== pendingImageId),
    );
  };

  const handleLocalUpload = async () => {
    const formData = new FormData();
    for (const pendingImage of pendingImages) {
      formData.append("images", pendingImage.file);
    }

    const response = await apiFetch<VisitImageUploadResponse>(`/api/visits/${visitId}/images`, {
      method: "POST",
      body: formData,
    });

    if (!response || !Array.isArray(response.images) || !Array.isArray(response.errors)) {
      throw new Error(t("uploadFailed"));
    }

    for (const pendingImage of pendingImages) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }

    pendingImagesRef.current = [];
    setPendingImages([]);
    setLocalImages((currentImages) => [...currentImages, ...response.images]);
    setSavedImageOrder((currentOrder) => [
      ...currentOrder,
      ...response.images.map((image) => String(image.id)),
    ]);

    if (response.errors.length > 0) {
      setUploadErrors(response.errors.map((error) => `${error.originalName}: ${error.reason}`));
    }

    if (response.images.length > 0) {
      await revalidatePublicCache({ parkSlug });
      setStatusMessage(t("uploadSuccess", { count: response.images.length }));
      router.refresh();
    }
  };

  const uploadImageDirectly = async (pendingImage: PendingImage): Promise<VisitImage> => {
    const uploadPlanRequest = {
      contentType: pendingImage.file.type as VisitImageUploadPlanRequest["contentType"],
      fileSizeBytes: pendingImage.file.size,
      originalName: pendingImage.file.name,
    } satisfies VisitImageUploadPlanRequest;

    const uploadPlan = await apiFetch<VisitImageUploadPlanResponse>(
      `/api/visits/${visitId}/images/upload-url`,
      {
        method: "POST",
        body: JSON.stringify(uploadPlanRequest),
      },
    );

    if (!uploadPlan?.uploadUrl || !uploadPlan?.key) {
      throw new Error(t("uploadFailed"));
    }

    const uploadResponse = await fetch(uploadPlan.uploadUrl, {
      method: uploadPlan.method,
      headers: uploadPlan.headers,
      body: pendingImage.file,
    });

    if (!uploadResponse.ok) {
      throw new Error(await getDirectUploadFailureMessage(uploadResponse, t("uploadFailed")));
    }

    const completeRequest = {
      key: uploadPlan.key,
      originalName: pendingImage.file.name,
    } satisfies VisitImageUploadCompleteRequest;

    const completedUpload = await apiFetch<VisitImageUploadCompleteResponse>(
      `/api/visits/${visitId}/images/complete`,
      {
        method: "POST",
        body: JSON.stringify(completeRequest),
      },
    );

    if (!completedUpload?.image) {
      throw new Error(t("uploadFailed"));
    }

    return completedUpload.image;
  };

  const handleDirectUpload = async () => {
    const uploadedImages: VisitImage[] = [];
    const nextUploadErrors: string[] = [];
    const uploadedPendingImageIds = new Set<string>();

    for (const pendingImage of pendingImages) {
      try {
        const uploadedImage = await uploadImageDirectly(pendingImage);
        uploadedImages.push(uploadedImage);
        uploadedPendingImageIds.add(pendingImage.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : t("uploadFailed");
        nextUploadErrors.push(getPendingUploadError(pendingImage.file.name, message));
      }
    }

    if (uploadedPendingImageIds.size > 0) {
      for (const pendingImage of pendingImages) {
        if (!uploadedPendingImageIds.has(pendingImage.id)) {
          continue;
        }

        URL.revokeObjectURL(pendingImage.previewUrl);
      }

      setPendingImages((currentImages) =>
        currentImages.filter((image) => !uploadedPendingImageIds.has(image.id)),
      );
      setLocalImages((currentImages) => [...currentImages, ...uploadedImages]);
      setSavedImageOrder((currentOrder) => [
        ...currentOrder,
        ...uploadedImages.map((image) => String(image.id)),
      ]);
      await revalidatePublicCache({ parkSlug });
      setStatusMessage(t("uploadSuccess", { count: uploadedImages.length }));
      router.refresh();
    }

    if (nextUploadErrors.length > 0) {
      setUploadErrors(nextUploadErrors);
    }
  };

  const handleUpload = async () => {
    if (pendingImages.length === 0 || isPreparingImages) {
      return;
    }

    setIsUploading(true);
    setActionError(null);
    setStatusMessage(null);
    setUploadErrors([]);

    try {
      if (isLocalImageUploadMode()) {
        await handleLocalUpload();
      } else {
        await handleDirectUpload();
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

    const previousImages = localImages;
    const previousSavedImageOrder = savedImageOrder;
    setActionError(null);
    setStatusMessage(null);
    setLocalImages((currentImages) => currentImages.filter((image) => image.id !== imageId));
    setSavedImageOrder((currentOrder) =>
      currentOrder.filter((currentImageId) => currentImageId !== String(imageId)),
    );

    try {
      await apiFetch(`/api/visits/${visitId}/images/${imageId}`, {
        method: "DELETE",
      });
      await revalidatePublicCache({ parkSlug });
      setStatusMessage(t("deleteSuccess"));
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("deleteFailed"));
      setLocalImages(previousImages);
      setSavedImageOrder(previousSavedImageOrder);
    }
  };

  const handleSaveImageOrder = async () => {
    if (!hasUnsavedImageOrder) {
      return;
    }

    setActionError(null);
    setStatusMessage(null);
    setIsReordering(true);

    try {
      await apiFetch(`/api/visits/${visitId}/images/reorder`, {
        method: "PATCH",
        body: JSON.stringify({
          imageIds: localImages.map((image) => image.id),
        }),
      });
      await revalidatePublicCache({ parkSlug });
      setSavedImageOrder(localImages.map((image) => String(image.id)));
      setStatusMessage(t("reorderSuccess"));
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("reorderFailed"));
    } finally {
      setIsReordering(false);
    }
  };

  const handleRestoreImageOrder = () => {
    setActionError(null);
    setStatusMessage(null);
    setLocalImages((currentImages) => {
      const imageById = new Map(currentImages.map((image) => [String(image.id), image]));

      return savedImageOrder.flatMap((imageId) => {
        const image = imageById.get(imageId);
        return image ? [image] : [];
      });
    });
  };

  return (
    <section className="mt-8 max-w-3xl space-y-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Images className="h-5 w-5 text-primary" aria-hidden="true" />
        {sectionTitle ?? t("title")}
      </h2>

      {localImages.length > 0 && (
        <div className="space-y-3">
          <VisitImageGallery
            images={localImages}
            dialogLabel={t("title")}
            thumbnailLayout="grid"
            getThumbnailProps={(image) => {
              const imageId = String(image.id);
              const isDragging =
                activeDrag?.collection === "saved" &&
                activeDrag.itemId === imageId &&
                activeDrag.isDragging;
              const isDropTarget =
                activeDrag?.collection === "saved" &&
                activeDrag.isDragging &&
                dragOverId === imageId &&
                activeDrag.itemId !== imageId;

              return {
                "data-saved-image-id": imageId,
                className: cn(
                  "transition-all duration-150 ease-out",
                  isDragging && "z-10 scale-[0.97] opacity-70 shadow-xl",
                  isDropTarget && "rounded-xl ring-2 ring-primary ring-offset-2",
                ),
              };
            }}
            getThumbnailButtonProps={(image) => {
              const imageId = String(image.id);

              return {
                onPointerDown: handleDragStart("saved", imageId),
                onPointerMove: handleDragMove,
                onPointerUp: finishDrag,
                onPointerCancel: cancelDrag,
                onKeyDown: handleSavedKeyDown(imageId),
                "aria-describedby": "visit-image-reorder-hint",
                className: "cursor-grab touch-none active:cursor-grabbing",
                draggable: false,
              };
            }}
            onThumbnailClick={(image, _index, event) => {
              if (suppressSavedThumbnailOpenRef.current === String(image.id)) {
                suppressSavedThumbnailOpenRef.current = null;
                event.preventDefault();
              }
            }}
            renderThumbnailOverlay={(image) => {
              return (
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
                  </div>
                </>
              );
            }}
          />

          {localImages.length > 1 && (
            <p id="visit-image-reorder-hint" className="text-sm text-muted-foreground">
              {t("reorderHint")}
            </p>
          )}

          {hasUnsavedImageOrder && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={handleSaveImageOrder}
                disabled={isReordering || activeDrag?.collection === "saved"}
                className="w-fit"
              >
                {isReordering ? t("savingOrder") : t("saveOrder")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleRestoreImageOrder}
                disabled={isReordering || activeDrag?.collection === "saved"}
                className="w-fit"
              >
                {t("restoreOrder")}
              </Button>
            </div>
          )}
        </div>
      )}

      {actionError && (
        <p
          className="rounded-[1.3rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          role="alert"
        >
          {actionError}
        </p>
      )}

      {statusMessage && (
        <output
          aria-live="polite"
          className="block rounded-[1.3rem] border border-emerald-600/20 bg-[linear-gradient(118deg,rgba(22,101,52,0.14),rgba(15,118,110,0.08))] px-4 py-3 text-sm text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] dark:border-emerald-300/18 dark:text-emerald-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        >
          {statusMessage}
        </output>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPreparingImages || isUploading}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t("selectFiles")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={isPreparingImages || isUploading}
            className="sr-only"
            aria-label={t("selectFiles")}
          />
          {isPreparingImages && (
            <span className="text-sm text-muted-foreground">{t("preparing")}</span>
          )}
          {pendingImages.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {t("selectedCount", { count: pendingImages.length })}
            </span>
          )}
        </div>

        {pendingImages.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 px-0.5 pb-2 pt-0.5">
              {pendingImages.map((pendingImage, index) => {
                const isDragging =
                  activeDrag?.collection === "pending" &&
                  activeDrag.itemId === pendingImage.id &&
                  activeDrag.isDragging;
                const isDropTarget =
                  activeDrag?.collection === "pending" &&
                  activeDrag.isDragging &&
                  dragOverId === pendingImage.id &&
                  activeDrag.itemId !== pendingImage.id;

                return (
                  <div
                    key={pendingImage.id}
                    data-pending-image-id={pendingImage.id}
                    className={cn(
                      "relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl border bg-muted shadow-sm transition-all duration-150 ease-out sm:w-32 md:w-36",
                      isDragging && "z-10 scale-[0.97] opacity-70 shadow-xl",
                      isDropTarget && "ring-2 ring-primary ring-offset-2",
                    )}
                  >
                    <button
                      type="button"
                      onPointerDown={handleDragStart("pending", pendingImage.id)}
                      onPointerMove={handleDragMove}
                      onPointerUp={finishDrag}
                      onPointerCancel={cancelDrag}
                      onKeyDown={handlePendingKeyDown(pendingImage.id)}
                      className="block h-full w-full cursor-grab overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:cursor-grabbing touch-none"
                      aria-label={t("reorderPendingImage", { index: index + 1 })}
                      aria-describedby="pending-image-reorder-hint"
                      draggable={false}
                    >
                      <img
                        src={pendingImage.previewUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(pendingImage.id)}
                      className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={t("removeFile")}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>

            {pendingImages.length > 1 && (
              <p id="pending-image-reorder-hint" className="text-sm text-muted-foreground">
                {t("pendingReorderHint")}
              </p>
            )}
          </div>
        )}

        {pendingImages.length > 0 && (
          <Button
            type="button"
            onClick={handleUpload}
            disabled={isPreparingImages || isUploading || activeDrag?.collection === "pending"}
          >
            {isUploading ? t("uploading") : t("upload")}
          </Button>
        )}

        {uploadErrors.length > 0 && (
          <ul
            className="space-y-1 rounded-[1.3rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            role="alert"
          >
            {uploadErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
