import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareImageFileForUpload } from "./image-upload";

const createLargeFile = (name: string, type: string, sizeInBytes: number) =>
  new File([new Uint8Array(sizeInBytes)], name, {
    type,
    lastModified: 123,
  });

const installImageBitmapMock = () => {
  class MockImageBitmap {
    width: number;
    height: number;
    close: ReturnType<typeof vi.fn>;

    constructor(width: number, height: number, close: ReturnType<typeof vi.fn>) {
      this.width = width;
      this.height = height;
      this.close = close;
    }
  }

  vi.stubGlobal("ImageBitmap", MockImageBitmap);
  return MockImageBitmap;
};

const createImageBitmapMock = ({
  width,
  height,
  close = vi.fn(),
  ImageBitmapClass,
}: {
  width: number;
  height: number;
  close?: ReturnType<typeof vi.fn>;
  ImageBitmapClass: ReturnType<typeof installImageBitmapMock>;
}) => {
  return new ImageBitmapClass(width, height, close) as unknown as ImageBitmap;
};

const setupCanvasMock = (blobs: Blob[]) => {
  const drawImage = vi.fn();
  const originalCreateElement = document.createElement.bind(document);

  const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tagName) => {
    const element = originalCreateElement(tagName);

    if (tagName !== "canvas") {
      return element;
    }

    const canvas = element as HTMLCanvasElement;

    Object.defineProperty(canvas, "getContext", {
      configurable: true,
      value: vi.fn(() => ({ drawImage })),
    });
    Object.defineProperty(canvas, "toBlob", {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => {
        callback(blobs.shift() ?? null);
      }),
    });

    return canvas;
  });

  return { createElementSpy, drawImage };
};

describe("prepareImageFileForUpload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the original file when optimization is not needed", async () => {
    const close = vi.fn();
    const ImageBitmapClass = installImageBitmapMock();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () =>
        createImageBitmapMock({
          width: 1200,
          height: 800,
          close,
          ImageBitmapClass,
        }),
      ),
    );

    const file = new File(["small"], "small.jpg", { type: "image/jpeg", lastModified: 456 });

    const result = await prepareImageFileForUpload(file);

    expect(result).toBe(file);
    expect(close).toHaveBeenCalled();
  });

  it("optimizes oversized images before upload", async () => {
    const close = vi.fn();
    const ImageBitmapClass = installImageBitmapMock();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () =>
        createImageBitmapMock({
          width: 5000,
          height: 3000,
          close,
          ImageBitmapClass,
        }),
      ),
    );

    const { drawImage } = setupCanvasMock([
      new Blob([new Uint8Array(1024)], { type: "image/webp" }),
    ]);
    const file = createLargeFile("huge.png", "image/png", 6 * 1024 * 1024);

    const result = await prepareImageFileForUpload(file);

    expect(result).not.toBe(file);
    expect(result.name).toBe("huge.webp");
    expect(result.type).toBe("image/webp");
    expect(result.lastModified).toBe(123);
    expect(result.size).toBeLessThan(file.size);
    expect(drawImage).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it("keeps the original file when re-encoding would make it larger without resizing", async () => {
    const close = vi.fn();
    const ImageBitmapClass = installImageBitmapMock();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () =>
        createImageBitmapMock({
          width: 2560,
          height: 1600,
          close,
          ImageBitmapClass,
        }),
      ),
    );

    setupCanvasMock([
      new Blob([new Uint8Array(6 * 1024 * 1024 + 512)], { type: "image/jpeg" }),
      new Blob([new Uint8Array(6 * 1024 * 1024 + 256)], { type: "image/jpeg" }),
      new Blob([new Uint8Array(6 * 1024 * 1024 + 128)], { type: "image/jpeg" }),
      new Blob([new Uint8Array(6 * 1024 * 1024 + 64)], { type: "image/jpeg" }),
    ]);
    const file = createLargeFile("original.jpg", "image/jpeg", 6 * 1024 * 1024);

    const result = await prepareImageFileForUpload(file);

    expect(result.name).toBe(file.name);
    expect(result.type).toBe(file.type);
    expect(result.size).toBe(file.size);
    expect(result.lastModified).toBe(file.lastModified);
    expect(close).toHaveBeenCalled();
  });
});
