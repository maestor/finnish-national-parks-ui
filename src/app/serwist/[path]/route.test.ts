import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSerwistRouteMock } = vi.hoisted(() => ({
  createSerwistRouteMock: vi.fn(() => ({
    GET: vi.fn(),
  })),
}));

vi.mock("@serwist/turbopack", () => ({
  createSerwistRoute: createSerwistRouteMock,
}));

describe("serwist route", () => {
  beforeEach(() => {
    createSerwistRouteMock.mockClear();
  });

  it("uses the service worker source without forcing native esbuild", async () => {
    await import("./route");

    expect(createSerwistRouteMock).toHaveBeenCalledWith({
      swSrc: "src/app/sw.ts",
      useNativeEsbuild: false,
    });
  });
});
