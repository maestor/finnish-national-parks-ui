"use client";

import { useTranslations } from "next-intl";
import { ManagedImageSection } from "@/components/images/managed-image-section";
import type { TripStop } from "@/lib/trips";

interface TripStopImageSectionProps {
  stopId: number;
  images: TripStop["images"];
  tripSlug: string;
}

const MAX_TRIP_STOP_IMAGES = 6;

export const TripStopImageSection = ({ stopId, images, tripSlug }: TripStopImageSectionProps) => {
  const commonT = useTranslations("controlPanel.visits.images");
  const t = useTranslations("controlPanel.trips.assignments.stopImages");
  const sectionTitle = t("title");

  return (
    <ManagedImageSection
      images={images}
      sectionTitle={sectionTitle}
      dialogLabel={sectionTitle}
      helperText={t("description")}
      maxImageCount={MAX_TRIP_STOP_IMAGES}
      uploadLocalPath={`/api/trip-stops/${stopId}/images`}
      uploadPlanPath={`/api/trip-stops/${stopId}/images/upload-url`}
      uploadCompletePath={`/api/trip-stops/${stopId}/images/complete`}
      deleteImagePath={(imageId) => `/api/trip-stops/${stopId}/images/${imageId}`}
      reorderPath={`/api/trip-stops/${stopId}/images/reorder`}
      revalidateTargets={{ tripSlug }}
      messages={{
        deleteConfirm: commonT("deleteConfirm"),
        deleteFailed: commonT("deleteFailed"),
        deleteImage: commonT("deleteImage"),
        deleteSuccess: commonT("deleteSuccess"),
        pendingReorderHint: commonT("pendingReorderHint"),
        preparing: commonT("preparing"),
        preprocessFailed: (name) => commonT("preprocessFailed", { name }),
        removeFile: commonT("removeFile"),
        reorderFailed: commonT("reorderFailed"),
        reorderHint: commonT("reorderHint"),
        reorderPendingImage: (index) => commonT("reorderPendingImage", { index }),
        reorderSuccess: commonT("reorderSuccess"),
        restoreOrder: commonT("restoreOrder"),
        saveOrder: commonT("saveOrder"),
        savingOrder: commonT("savingOrder"),
        selectFiles: commonT("selectFiles"),
        selectedCount: (count) => commonT("selectedCount", { count }),
        unsupportedType: (name) => commonT("unsupportedType", { name }),
        upload: commonT("upload"),
        uploadFailed: commonT("uploadFailed"),
        uploadSuccess: (count) => commonT("uploadSuccess", { count }),
        uploading: commonT("uploading"),
        maxImagesReached: (maxImageCount) => t("maxImagesReached", { count: maxImageCount }),
        maxImagesSummary: (currentImageCount, maxImageCount) =>
          t("maxImagesSummary", {
            current: currentImageCount,
            max: maxImageCount,
          }),
      }}
    />
  );
};
