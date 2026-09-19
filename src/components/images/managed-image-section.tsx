"use client";

import { Images, LoaderCircle, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, KeyboardEvent, PointerEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { useSnackbar } from "@/components/providers/snackbar-provider";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { VisitImageGallery } from "@/components/visits/visit-image-gallery";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { isLocalImageUploadMode, prepareImageFileForUpload } from "@/lib/image-upload";
import type { VisitImage } from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";

type UploadStage = "waiting" | "requesting" | "uploading" | "processing" | "complete" | "failed";

interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  originalName: string;
  stage: UploadStage;
}

interface ActiveDrag {
  collection: "saved" | "pending";
  itemId: string;
  pointerId: number;
  startX: number;
  startY: number;
  isDragging: boolean;
}

interface LocalUploadResponse {
  errors: {
    originalName: string;
    reason: string;
  }[];
  images: VisitImage[];
}

interface DirectUploadPlanRequest {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  fileSizeBytes: number;
  originalName: string;
}

interface DirectUploadPlanResponse {
  expiresAt: string;
  headers: Record<string, string>;
  key: string;
  method: "PUT";
  uploadUrl: string;
}

interface DirectUploadCompleteRequest {
  fullHeight?: number | null;
  fullWidth?: number | null;
  key: string;
  originalName?: string | null;
}

interface DirectUploadCompleteResponse {
  image: VisitImage;
}

interface ManagedImageMessages {
  deleteConfirm: string;
  deleteFailed: string;
  deleteImage: string;
  deleteSuccess: string;
  pendingReorderHint: string;
  preprocessFailed: (name: string) => string;
  removeFile: string;
  reorderFailed: string;
  reorderHint: string;
  reorderPendingImage: (index: number) => string;
  reorderSuccess: string;
  restoreOrder: string;
  saveOrder: string;
  savingOrder: string;
  selectFiles: string;
  selectedCount: (count: number) => string;
  unsupportedType: (name: string) => string;
  upload: string;
  uploadFailed: string;
  uploadSuccess: (count: number) => string;
  uploading: string;
  preparationProgress: (current: number, total: number) => string;
  uploadProgress: (completed: number, total: number) => string;
  stage: (stage: UploadStage) => string;
  queuePaused: string;
  retryUpload: string;
  keepPageOpen: string;
  maxImagesReached?: (maxImageCount: number) => string;
  maxImagesSummary?: (currentImageCount: number, maxImageCount: number) => string;
}

interface ManagedImageSectionProps {
  deleteImagePath: (imageId: number) => string;
  dialogLabel: string;
  helperText?: string;
  images: VisitImage[];
  maxImageCount?: number;
  messages: ManagedImageMessages;
  onSavedImagesChange?: (images: VisitImage[]) => void;
  reorderPath: string;
  revalidateTargets: {
    parkSlug?: string | null;
    tripSlug?: string | null;
  };
  sectionTitle: string;
  uploadCompletePath: string;
  uploadLocalPath: string;
  uploadPlanPath: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DRAG_START_DISTANCE = 6;

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

export const ManagedImageSection = ({
  deleteImagePath,
  dialogLabel,
  helperText,
  images,
  maxImageCount,
  messages,
  onSavedImagesChange,
  reorderPath,
  revalidateTargets,
  sectionTitle,
  uploadCompletePath,
  uploadLocalPath,
  uploadPlanPath,
}: ManagedImageSectionProps) => {
  const router = useRouter();
  const sectionId = useId();
  const savedHintId = `${sectionId}-saved-hint`;
  const pendingHintId = `${sectionId}-pending-hint`;
  const { showSnackbar } = useSnackbar();
  const [localImages, setLocalImages] = useState(images);
  const [savedImageOrder, setSavedImageOrder] = useState(images.map((image) => String(image.id)));
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const [preparationProgress, setPreparationProgress] = useState({ current: 0, total: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [preparationErrors, setPreparationErrors] = useState<string[]>([]);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const activeDragRef = useRef<ActiveDrag | null>(null);
  const dragOverIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImageIdRef = useRef(0);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  const savedImageOrderRef = useRef(savedImageOrder);
  const previousImagesRef = useRef<VisitImage[]>(images);
  const suppressSavedThumbnailOpenRef = useRef<string | null>(null);

  useEffect(() => {
    savedImageOrderRef.current = savedImageOrder;
  }, [savedImageOrder]);

  useEffect(() => {
    const previousIds = previousImagesRef.current.map((image) => String(image.id));
    const currentIds = images.map((image) => String(image.id));
    const previousIdSet = new Set(previousIds);
    const currentIdSet = new Set(currentIds);

    const addedImages = images.filter((image) => !previousIdSet.has(String(image.id)));
    const removedIds = previousIds.filter((id) => !currentIdSet.has(id));

    if (addedImages.length > 0 || removedIds.length > 0) {
      setLocalImages((currentLocalImages) => {
        const localIds = new Set(currentLocalImages.map((image) => String(image.id)));
        const actuallyAdded = addedImages.filter((image) => !localIds.has(String(image.id)));
        const keptImages = currentLocalImages.filter(
          (image) => !removedIds.includes(String(image.id)),
        );
        return [...keptImages, ...actuallyAdded];
      });

      setSavedImageOrder((currentOrder) => {
        const actuallyAddedIds = addedImages
          .map((image) => String(image.id))
          .filter((id) => !currentOrder.includes(id));
        const keptOrder = currentOrder.filter((id) => !removedIds.includes(id));
        return [...keptOrder, ...actuallyAddedIds];
      });
    } else if (
      !ordersMatch(previousIds, currentIds) &&
      !ordersMatch(savedImageOrderRef.current, currentIds)
    ) {
      setLocalImages(images);
      setSavedImageOrder(currentIds);
    }

    previousImagesRef.current = images;
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

  const isBusy = isUploading || isPreparingImages || isReordering;
  const hasFailedUpload = pendingImages.some((image) => image.stage === "failed");
  const completedCount = pendingImages.filter((image) => image.stage === "complete").length;
  const activeImage = pendingImages.find(
    (image) =>
      image.stage === "requesting" || image.stage === "uploading" || image.stage === "processing",
  );
  const totalImageCount = localImages.length + pendingImages.length;
  const hasReachedImageLimit =
    maxImageCount !== undefined ? totalImageCount >= maxImageCount : false;
  const hasUnsavedImageOrder = !ordersMatch(
    savedImageOrder,
    localImages.map((image) => String(image.id)),
  );

  const moveSavedImage = (activeId: string, overId: string) => {
    if (isBusy) return;
    setLocalImages((currentImages) => reorderItems(currentImages, activeId, overId));
  };

  const movePendingImage = (activeId: string, overId: string) => {
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
      if (isBusy) return;
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
    setPreparationErrors([]);

    const remainingImageSlots =
      maxImageCount !== undefined ? Math.max(maxImageCount - totalImageCount, 0) : files.length;
    const selectableFiles =
      maxImageCount !== undefined ? files.slice(0, remainingImageSlots) : files;

    if (files.length > selectableFiles.length && messages.maxImagesReached && maxImageCount) {
      errors.push(messages.maxImagesReached(maxImageCount));
    }

    if (selectableFiles.length === 0) {
      setPreparationErrors(errors);
      event.target.value = "";
      return;
    }

    setIsPreparingImages(true);

    try {
      for (const [index, file] of selectableFiles.entries()) {
        setPreparationProgress({ current: index + 1, total: selectableFiles.length });
        if (!ACCEPTED_TYPES.includes(file.type)) {
          errors.push(messages.unsupportedType(file.name));
          continue;
        }

        try {
          const preparedFile = await prepareImageFileForUpload(file);
          pendingImageIdRef.current += 1;
          validFiles.push({
            id: `pending-image-${pendingImageIdRef.current}`,
            file: preparedFile,
            previewUrl: URL.createObjectURL(preparedFile),
            originalName: file.name,
            stage: "waiting",
          });
        } catch {
          errors.push(messages.preprocessFailed(file.name));
        }
      }
    } finally {
      setIsPreparingImages(false);
      event.target.value = "";
    }

    if (errors.length > 0) {
      setPreparationErrors((currentErrors) => [...currentErrors, ...errors]);
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

  const setUploadStage = (id: string, stage: UploadStage) => {
    setPendingImages((current) =>
      current.map((image) => (image.id === id ? { ...image, stage } : image)),
    );
  };

  const uploadImageLocally = async (pendingImage: PendingImage): Promise<VisitImage> => {
    setUploadStage(pendingImage.id, "uploading");
    const formData = new FormData();
    formData.append("images", pendingImage.file);
    const response = await apiFetch<LocalUploadResponse>(uploadLocalPath, {
      method: "POST",
      body: formData,
    });
    if (!response || !Array.isArray(response.images) || !Array.isArray(response.errors)) {
      throw new Error(messages.uploadFailed);
    }
    const image = response.images[0];
    if (!image) {
      throw new Error(messages.uploadFailed);
    }
    return image;
  };

  const uploadImageDirectly = async (pendingImage: PendingImage): Promise<VisitImage> => {
    setUploadStage(pendingImage.id, "requesting");
    const uploadPlanRequest = {
      contentType: pendingImage.file.type as DirectUploadPlanRequest["contentType"],
      fileSizeBytes: pendingImage.file.size,
      originalName: pendingImage.file.name,
    } satisfies DirectUploadPlanRequest;

    const uploadPlan = await apiFetch<DirectUploadPlanResponse>(uploadPlanPath, {
      method: "POST",
      body: JSON.stringify(uploadPlanRequest),
    });

    if (!uploadPlan?.uploadUrl || !uploadPlan?.key) {
      throw new Error(messages.uploadFailed);
    }

    setUploadStage(pendingImage.id, "uploading");
    const uploadResponse = await fetch(uploadPlan.uploadUrl, {
      method: uploadPlan.method,
      headers: uploadPlan.headers,
      body: pendingImage.file,
    });

    if (!uploadResponse.ok) {
      throw new Error(messages.uploadFailed);
    }

    setUploadStage(pendingImage.id, "processing");
    const completeRequest = {
      key: uploadPlan.key,
      originalName: pendingImage.file.name,
    } satisfies DirectUploadCompleteRequest;

    const completedUpload = await apiFetch<DirectUploadCompleteResponse>(uploadCompletePath, {
      method: "POST",
      body: JSON.stringify(completeRequest),
    });

    if (!completedUpload?.image) {
      throw new Error(messages.uploadFailed);
    }

    return completedUpload.image;
  };

  const handleUpload = async () => {
    if (pendingImages.length === 0 || isBusy) return;

    setIsUploading(true);
    setPreparationErrors([]);
    setPendingImages((current) => current.map((image) => ({ ...image, stage: "waiting" })));
    const uploadedImages: VisitImage[] = [];
    const uploadedIds = new Set<string>();
    try {
      for (const pendingImage of pendingImages) {
        try {
          const image = isLocalImageUploadMode()
            ? await uploadImageLocally(pendingImage)
            : await uploadImageDirectly(pendingImage);
          uploadedImages.push(image);
          uploadedIds.add(pendingImage.id);
          setUploadStage(pendingImage.id, "complete");
        } catch {
          setUploadStage(pendingImage.id, "failed");
          showSnackbar({ message: messages.uploadFailed, tone: "error" });
          // Later files must not overtake this slot. Retry resumes this same queue.
          break;
        }
      }

      if (uploadedImages.length > 0) {
        for (const pendingImage of pendingImages) {
          if (uploadedIds.has(pendingImage.id)) URL.revokeObjectURL(pendingImage.previewUrl);
        }
        setPendingImages((current) => current.filter((image) => !uploadedIds.has(image.id)));
        const nextImages = [...localImages, ...uploadedImages];
        setLocalImages(nextImages);
        setSavedImageOrder((current) => [
          ...current,
          ...uploadedImages.map((image) => String(image.id)),
        ]);
        onSavedImagesChange?.(nextImages);
        await revalidatePublicCache(revalidateTargets);
        if (uploadedImages.length === pendingImages.length) {
          showSnackbar({ message: messages.uploadSuccess(uploadedImages.length), tone: "success" });
        }
        router.refresh();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!window.confirm(messages.deleteConfirm)) {
      return;
    }

    const previousImages = localImages;
    const previousSavedImageOrder = savedImageOrder;
    const nextImages = localImages.filter((image) => image.id !== imageId);
    setLocalImages(nextImages);
    setSavedImageOrder((currentOrder) =>
      currentOrder.filter((currentImageId) => currentImageId !== String(imageId)),
    );

    try {
      await apiFetch(deleteImagePath(imageId), {
        method: "DELETE",
      });
      await revalidatePublicCache(revalidateTargets);
      onSavedImagesChange?.(nextImages);
      showSnackbar({ message: messages.deleteSuccess, tone: "success" });
      router.refresh();
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : messages.deleteFailed,
        tone: "error",
      });
      setLocalImages(previousImages);
      setSavedImageOrder(previousSavedImageOrder);
    }
  };

  const handleSaveImageOrder = async () => {
    if (!hasUnsavedImageOrder) {
      return;
    }

    setIsReordering(true);

    try {
      await apiFetch(reorderPath, {
        method: "PATCH",
        body: JSON.stringify({
          imageIds: localImages.map((image) => image.id),
        }),
      });
      await revalidatePublicCache(revalidateTargets);
      setSavedImageOrder(localImages.map((image) => String(image.id)));
      onSavedImagesChange?.(localImages);
      showSnackbar({ message: messages.reorderSuccess, tone: "success" });
      router.refresh();
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : messages.reorderFailed,
        tone: "error",
      });
    } finally {
      setIsReordering(false);
    }
  };

  const handleRestoreImageOrder = () => {
    setLocalImages((currentImages) => {
      const imageById = new Map(currentImages.map((image) => [String(image.id), image]));

      return savedImageOrder.flatMap((imageId) => {
        const image = imageById.get(imageId);
        return image ? [image] : [];
      });
    });
  };

  const maxImagesSummary =
    maxImageCount !== undefined && messages.maxImagesSummary
      ? messages.maxImagesSummary(totalImageCount, maxImageCount)
      : null;

  return (
    <section className="mt-8 max-w-3xl space-y-6">
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Images className="h-5 w-5 text-primary" aria-hidden="true" />
          {sectionTitle}
        </h2>
        {helperText !== undefined && <p className="text-sm text-muted-foreground">{helperText}</p>}
        {maxImagesSummary !== null && (
          <p className="text-sm text-muted-foreground">{maxImagesSummary}</p>
        )}
      </div>

      {localImages.length > 0 && (
        <div className="space-y-3">
          <VisitImageGallery
            images={localImages}
            dialogLabel={dialogLabel}
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
                "aria-describedby": savedHintId,
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
                          void handleDelete(image.id);
                        }}
                        className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-destructive/90 text-white shadow-sm transition-colors disabled:opacity-50 hover:bg-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        disabled={isBusy}
                        aria-label={messages.deleteImage}
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
            <p id={savedHintId} className="text-sm text-muted-foreground">
              {messages.reorderHint}
            </p>
          )}

          {hasUnsavedImageOrder && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => void handleSaveImageOrder()}
                disabled={isBusy || activeDrag?.collection === "saved"}
                className="w-fit"
              >
                {isReordering ? messages.savingOrder : messages.saveOrder}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleRestoreImageOrder}
                disabled={isBusy || activeDrag?.collection === "saved"}
                className="w-fit"
              >
                {messages.restoreOrder}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy || hasReachedImageLimit}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {messages.selectFiles}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            disabled={isBusy || hasReachedImageLimit}
            className="sr-only"
            aria-label={messages.selectFiles}
          />
          {isPreparingImages === true && (
            <span className="text-sm text-muted-foreground" role="status">
              {messages.preparationProgress(preparationProgress.current, preparationProgress.total)}
            </span>
          )}
          {pendingImages.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {messages.selectedCount(pendingImages.length)}
            </span>
          )}
        </div>

        {pendingImages.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{messages.keepPageOpen}</p>
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
                      "relative w-28 shrink-0 overflow-hidden rounded-xl border bg-muted shadow-sm transition-all duration-150 ease-out sm:w-32 md:w-36",
                      pendingImage.stage === "failed" && "border-red-700 dark:border-red-400",
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
                      disabled={isBusy}
                      className="block aspect-square w-full cursor-grab overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:cursor-grabbing disabled:cursor-default touch-none"
                      aria-label={messages.reorderPendingImage(index + 1)}
                      aria-describedby={`${pendingHintId} ${sectionId}-${pendingImage.id}`}
                      draggable={false}
                    >
                      <div className="relative h-full w-full">
                        <AppImage
                          src={pendingImage.previewUrl}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 112px, 144px"
                          className="object-cover"
                          draggable={false}
                        />
                      </div>
                    </button>
                    <div
                      id={`${sectionId}-${pendingImage.id}`}
                      className="space-y-1 border-t bg-background p-2 text-xs"
                    >
                      <p className="break-words font-medium">
                        {localImages.length + index + 1}. {pendingImage.originalName}
                      </p>
                      <p
                        className={cn(
                          "text-muted-foreground",
                          pendingImage.stage === "failed" && "text-red-700 dark:text-red-300",
                        )}
                      >
                        {messages.stage(pendingImage.stage)}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleRemoveFile(pendingImage.id)}
                      className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors disabled:opacity-50 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={messages.removeFile}
                      aria-describedby={`${sectionId}-${pendingImage.id}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>

            {pendingImages.length > 1 && (
              <p id={pendingHintId} className="text-sm text-muted-foreground">
                {messages.pendingReorderHint}
              </p>
            )}
          </div>
        )}

        {pendingImages.length > 0 && (
          <Button
            type="button"
            onClick={() => void handleUpload()}
            disabled={isBusy || activeDrag?.collection === "pending"}
          >
            {isUploading
              ? messages.uploading
              : hasFailedUpload
                ? messages.retryUpload
                : messages.upload}
          </Button>
        )}

        {isUploading && pendingImages.length > 0 && (
          <div className="space-y-2 rounded-xl border bg-muted/50 p-4">
            <div role="status" className="space-y-1 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                {messages.uploadProgress(completedCount, pendingImages.length)}
              </p>
              {activeImage !== undefined && (
                <p className="break-words">
                  {activeImage.originalName}: {messages.stage(activeImage.stage)}
                </p>
              )}
            </div>
            <progress
              className="h-2 w-full accent-primary"
              max={pendingImages.length}
              value={completedCount}
              aria-label={messages.uploading}
            />
          </div>
        )}
        {hasFailedUpload && !isUploading && (
          <p
            className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-red-700 dark:text-red-300"
            role="status"
          >
            {messages.queuePaused}
          </p>
        )}

        {preparationErrors.length > 0 && (
          <ul
            className="space-y-1 break-words rounded-[1.3rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-red-700 dark:text-red-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            role="alert"
          >
            {preparationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
