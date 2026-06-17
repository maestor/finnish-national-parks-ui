import { describe, expect, it, vi } from "vitest";

const { withSerwistMock, withNextIntlPluginMock } = vi.hoisted(() => ({
  withSerwistMock: vi.fn((config) => config),
  withNextIntlPluginMock: vi.fn(() => (config: unknown) => config),
}));

vi.mock("@serwist/turbopack", () => ({
  withSerwist: withSerwistMock,
}));

vi.mock("next-intl/plugin", () => ({
  default: withNextIntlPluginMock,
}));

describe("next config", () => {
  it("includes the Serwist wasm runtime files in the route trace", async () => {
    const configModule = await import("./next.config");

    expect(withNextIntlPluginMock).toHaveBeenCalledWith("./src/i18n/request.ts");
    expect(withSerwistMock).toHaveBeenCalledTimes(1);
    expect(configModule.default).toEqual({
      outputFileTracingIncludes: {
        "/serwist/*": ["./node_modules/esbuild-wasm/**/*"],
      },
    });
  });
});
