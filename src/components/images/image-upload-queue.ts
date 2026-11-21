import { apiFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";
import { isLocalImageUploadMode } from "@/lib/image-upload";
import type { VisitImage } from "@/lib/parks";

export type UploadStage =
  | "waiting"
  | "requesting"
  | "uploading"
  | "processing"
  | "complete"
  | "failed";

export interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
  originalName: string;
  stage: UploadStage;
}

interface LocalUploadResponse {
  errors: {
    originalName: string;
    reason: string;
  }[];
  images: VisitImage[];
}

type UploadPlan = paths["/api/visits/{id}/images/upload-url"]["post"];
type UploadCompletion = paths["/api/visits/{id}/images/complete"]["post"];
type DirectUploadPlanRequest = NonNullable<
  UploadPlan["requestBody"]
>["content"]["application/json"];
type DirectUploadPlanResponse = UploadPlan["responses"][201]["content"]["application/json"];
type DirectUploadCompleteRequest = NonNullable<
  UploadCompletion["requestBody"]
>["content"]["application/json"];
type DirectUploadCompleteResponse = UploadCompletion["responses"][
  | 200
  | 201]["content"]["application/json"];

interface ImageUploadPaths {
  uploadCompletePath: string;
  uploadLocalPath: string;
  uploadPlanPath: string;
}

type ReportTransportStage = (stage: "requesting" | "uploading" | "processing") => void;

const uploadImageLocally = async (
  file: File,
  uploadLocalPath: string,
  reportStage: ReportTransportStage,
): Promise<VisitImage> => {
  reportStage("uploading");
  const formData = new FormData();
  formData.append("images", file);
  const response = await apiFetch<LocalUploadResponse>(uploadLocalPath, {
    method: "POST",
    body: formData,
  });
  if (!response || !Array.isArray(response.images) || !Array.isArray(response.errors)) {
    throw new Error("Image upload failed");
  }
  const image = response.images[0];
  if (!image) {
    throw new Error("Image upload failed");
  }
  return image;
};

const uploadImageDirectly = async (
  file: File,
  { uploadPlanPath, uploadCompletePath }: ImageUploadPaths,
  reportStage: ReportTransportStage,
): Promise<VisitImage> => {
  reportStage("requesting");
  const uploadPlanRequest = {
    contentType: file.type as DirectUploadPlanRequest["contentType"],
    fileSizeBytes: file.size,
    originalName: file.name,
  } satisfies DirectUploadPlanRequest;

  const uploadPlan = await apiFetch<DirectUploadPlanResponse>(uploadPlanPath, {
    method: "POST",
    body: JSON.stringify(uploadPlanRequest),
  });

  if (!uploadPlan?.uploadUrl || !uploadPlan?.key) {
    throw new Error("Image upload failed");
  }

  reportStage("uploading");
  const uploadResponse = await fetch(uploadPlan.uploadUrl, {
    method: uploadPlan.method,
    headers: uploadPlan.headers,
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Image upload failed");
  }

  reportStage("processing");
  const completeRequest = {
    key: uploadPlan.key,
    originalName: file.name,
  } satisfies DirectUploadCompleteRequest;

  const completedUpload = await apiFetch<DirectUploadCompleteResponse>(uploadCompletePath, {
    method: "POST",
    body: JSON.stringify(completeRequest),
  });

  if (!completedUpload?.image) {
    throw new Error("Image upload failed");
  }

  return completedUpload.image;
};

interface SavedUpload {
  pendingImage: PendingImage;
  image: VisitImage;
}

export const uploadImageBatch = async (
  pendingImages: PendingImage[],
  paths: ImageUploadPaths,
  setStage: (id: string, stage: UploadStage) => void,
): Promise<{ saved: SavedUpload[]; failed: PendingImage | null }> => {
  const saved: SavedUpload[] = [];
  for (const pendingImage of pendingImages) {
    const reportStage: ReportTransportStage = (stage) => setStage(pendingImage.id, stage);

    try {
      const image = isLocalImageUploadMode()
        ? await uploadImageLocally(pendingImage.file, paths.uploadLocalPath, reportStage)
        : await uploadImageDirectly(pendingImage.file, paths, reportStage);
      saved.push({ pendingImage, image });
      setStage(pendingImage.id, "complete");
    } catch {
      setStage(pendingImage.id, "failed");
      // Keep later files queued behind the failed upload.
      return { saved, failed: pendingImage };
    }
  }

  return { saved, failed: null };
};
