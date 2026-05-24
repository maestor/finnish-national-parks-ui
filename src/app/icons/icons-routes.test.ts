import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getAppleTouchIcon } from "./apple-touch-icon.png/route";
import { GET as getFavicon32 } from "./favicon-32x32.png/route";
import { GET as getIcon192 } from "./icon-192x192.png/route";
import { GET as getIcon512 } from "./icon-512x512.png/route";

const { createPwaIconResponseMock } = vi.hoisted(() => ({
  createPwaIconResponseMock: vi.fn((size: number) => ({ size })),
}));

vi.mock("@/lib/pwa-icon", () => ({
  createPwaIconResponse: createPwaIconResponseMock,
}));

describe("icon routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves the 32 pixel favicon", () => {
    expect(getFavicon32()).toEqual({ size: 32 });
    expect(createPwaIconResponseMock).toHaveBeenCalledWith(32);
  });

  it("serves the Apple touch icon", () => {
    expect(getAppleTouchIcon()).toEqual({ size: 180 });
    expect(createPwaIconResponseMock).toHaveBeenCalledWith(180);
  });

  it("serves the 192 pixel manifest icon", () => {
    expect(getIcon192()).toEqual({ size: 192 });
    expect(createPwaIconResponseMock).toHaveBeenCalledWith(192);
  });

  it("serves the 512 pixel manifest icon", () => {
    expect(getIcon512()).toEqual({ size: 512 });
    expect(createPwaIconResponseMock).toHaveBeenCalledWith(512);
  });
});
