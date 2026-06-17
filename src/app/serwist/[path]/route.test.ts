import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSerwistRouteMock } = vi.hoisted(() => ({
  createSerwistRouteMock: vi.fn(() => ({
    GET: vi.fn(),
  })),
}));

vi.mock("@/lib/serwist/create-serwist-route", () => ({
  createSerwistRoute: createSerwistRouteMock,
}));

describe("serwist route", () => {
  beforeEach(() => {
    createSerwistRouteMock.mockClear();
  });

  it("uses the local Serwist route helper with the repo Next config defaults", async () => {
    await import("./route");

    expect(createSerwistRouteMock).toHaveBeenCalledWith({
      nextConfig: {
        assetPrefix: "",
        basePath: "/",
        distDir: ".next",
      },
      swSrc: "src/app/sw.ts",
      useNativeEsbuild: false,
    });
  });
});
