"use client";

import { useTranslations } from "next-intl";
import { ManagedImageSection } from "@/components/images/managed-image-section";
import type { VisitImage } from "@/lib/parks";

interface VisitImageSectionProps {
  visitId: number;
  images: VisitImage[];
  parkSlug: string;
  sectionTitle?: string;
  tripSlug?: string | null;
}

export const VisitImageSection = ({
  visitId,
  images,
  parkSlug,
  sectionTitle,
  tripSlug = null,
}: VisitImageSectionProps) => {
  const t = useTranslations("controlPanel.visits.images");
  const resolvedSectionTitle = sectionTitle ?? t("title");

  return (
    <ManagedImageSection
      images={images}
      sectionTitle={resolvedSectionTitle}
      dialogLabel={resolvedSectionTitle}
      uploadLocalPath={`/api/visits/${visitId}/images`}
      uploadPlanPath={`/api/visits/${visitId}/images/upload-url`}
      uploadCompletePath={`/api/visits/${visitId}/images/complete`}
      deleteImagePath={(imageId) => `/api/visits/${visitId}/images/${imageId}`}
      reorderPath={`/api/visits/${visitId}/images/reorder`}
      revalidateTargets={{ parkSlug, tripSlug }}
      messages={{
        deleteConfirm: t("deleteConfirm"),
        deleteFailed: t("deleteFailed"),
        deleteImage: t("deleteImage"),
        deleteSuccess: t("deleteSuccess"),
        pendingReorderHint: t("pendingReorderHint"),
        preparing: t("preparing"),
        preprocessFailed: (name) => t("preprocessFailed", { name }),
        removeFile: t("removeFile"),
        reorderFailed: t("reorderFailed"),
        reorderHint: t("reorderHint"),
        reorderPendingImage: (index) => t("reorderPendingImage", { index }),
        reorderSuccess: t("reorderSuccess"),
        restoreOrder: t("restoreOrder"),
        saveOrder: t("saveOrder"),
        savingOrder: t("savingOrder"),
        selectFiles: t("selectFiles"),
        selectedCount: (count) => t("selectedCount", { count }),
        unsupportedType: (name) => t("unsupportedType", { name }),
        upload: t("upload"),
        uploadFailed: t("uploadFailed"),
        uploadSuccess: (count) => t("uploadSuccess", { count }),
        uploading: t("uploading"),
      }}
    />
  );
};
