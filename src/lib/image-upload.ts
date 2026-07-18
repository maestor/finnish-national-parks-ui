"use client";

const MAX_IMAGE_DIMENSION = 2560;
const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const TARGET_IMAGE_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const FALLBACK_QUALITY_STEPS = [0.82, 0.74, 0.66, 0.58];
const LOCAL_UPLOAD_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

type LoadedImageSource = ImageBitmap | HTMLImageElement;

const MIME_TYPE_EXTENSION_MAP = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const getScaledDimensions = (width: number, height: number) => {
  const longestSide = Math.max(width, height);

  if (longestSide <= MAX_IMAGE_DIMENSION) {
    return { width, height };
  }

  const scale = MAX_IMAGE_DIMENSION / longestSide;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const getOutputMimeType = (inputMimeType: string) => {
  if (inputMimeType === "image/png") {
    return "image/webp";
  }

  return inputMimeType === "image/webp" ? "image/webp" : "image/jpeg";
};

const getOutputFileName = (inputFileName: string, outputMimeType: string) => {
  const fileExtension =
    MIME_TYPE_EXTENSION_MAP[outputMimeType as keyof typeof MIME_TYPE_EXTENSION_MAP] ?? "jpg";
  const extensionPattern = /\.[^.]+$/;

  if (!extensionPattern.test(inputFileName)) {
    return `${inputFileName}.${fileExtension}`;
  }

  return inputFileName.replace(extensionPattern, `.${fileExtension}`);
};

const loadImageWithBitmap = async (file: File): Promise<LoadedImageSource | null> => {
  if (typeof createImageBitmap !== "function") {
    return null;
  }

  return createImageBitmap(file);
};

const loadImageWithElement = async (file: File): Promise<LoadedImageSource> => {
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };

    image.src = objectUrl;
  });
};

const loadImageSource = async (file: File) => {
  const imageBitmap = await loadImageWithBitmap(file);

  if (imageBitmap) {
    return imageBitmap;
  }

  return loadImageWithElement(file);
};

const isImageBitmapSource = (imageSource: LoadedImageSource): imageSource is ImageBitmap => {
  return typeof ImageBitmap !== "undefined" && imageSource instanceof ImageBitmap;
};

const getImageDimensions = (imageSource: LoadedImageSource) => {
  if (isImageBitmapSource(imageSource)) {
    return {
      width: imageSource.width,
      height: imageSource.height,
    };
  }

  return {
    width: imageSource.naturalWidth,
    height: imageSource.naturalHeight,
  };
};

const encodeCanvasToBlob = (
  canvas: HTMLCanvasElement,
  outputMimeType: string,
  quality?: number,
) => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Image encoding failed"));
          return;
        }

        resolve(blob);
      },
      outputMimeType,
      quality,
    );
  });
};

const closeImageSource = (imageSource: LoadedImageSource) => {
  if ("close" in imageSource && typeof imageSource.close === "function") {
    imageSource.close();
  }
};

const shouldOptimizeImage = ({
  file,
  imageWidth,
  imageHeight,
}: {
  file: File;
  imageWidth: number;
  imageHeight: number;
}) => {
  return (
    file.size > MAX_IMAGE_FILE_SIZE_BYTES ||
    imageWidth > MAX_IMAGE_DIMENSION ||
    imageHeight > MAX_IMAGE_DIMENSION
  );
};

const drawImageToCanvas = (imageSource: LoadedImageSource, width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas rendering context unavailable");
  }

  context.drawImage(imageSource, 0, 0, width, height);
  return canvas;
};

const createOptimizedFile = ({ blob, file }: { blob: Blob; file: File }) => {
  const outputMimeType = blob.type || getOutputMimeType(file.type);

  return new File([blob], getOutputFileName(file.name, outputMimeType), {
    type: outputMimeType,
    lastModified: file.lastModified,
  });
};

const pickSmallestBlob = (currentSmallest: Blob | null, candidate: Blob) => {
  if (!currentSmallest || candidate.size < currentSmallest.size) {
    return candidate;
  }

  return currentSmallest;
};

export const isLocalImageUploadMode = (hostname?: string) => {
  const resolvedHostname =
    hostname ?? (typeof window === "undefined" ? "localhost" : window.location.hostname);

  return LOCAL_UPLOAD_HOSTNAMES.has(resolvedHostname);
};

export const prepareImageFileForUpload = async (file: File) => {
  const imageSource = await loadImageSource(file);

  try {
    const { width: sourceWidth, height: sourceHeight } = getImageDimensions(imageSource);
    const outputMimeType = getOutputMimeType(file.type);

    if (
      !shouldOptimizeImage({
        file,
        imageWidth: sourceWidth,
        imageHeight: sourceHeight,
      })
    ) {
      return file;
    }

    const { width, height } = getScaledDimensions(sourceWidth, sourceHeight);
    const canvas = drawImageToCanvas(imageSource, width, height);

    let smallestBlob: Blob | null = null;

    for (const quality of FALLBACK_QUALITY_STEPS) {
      const encodedBlob = await encodeCanvasToBlob(canvas, outputMimeType, quality);
      smallestBlob = pickSmallestBlob(smallestBlob, encodedBlob);

      if (encodedBlob.size <= TARGET_IMAGE_FILE_SIZE_BYTES) {
        return createOptimizedFile({ blob: encodedBlob, file });
      }
    }

    if (!smallestBlob) {
      throw new Error("Image encoding failed");
    }

    const optimizedFile = createOptimizedFile({ blob: smallestBlob, file });

    if (optimizedFile.size >= file.size && width === sourceWidth && height === sourceHeight) {
      return file;
    }

    return optimizedFile;
  } finally {
    closeImageSource(imageSource);
  }
};
