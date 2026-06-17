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
  it("wraps the app config without a custom Serwist trace include", async () => {
    const configModule = await import("./next.config");

    expect(withNextIntlPluginMock).toHaveBeenCalledWith("./src/i18n/request.ts");
    expect(withSerwistMock).toHaveBeenCalledTimes(1);
    expect(configModule.default).toEqual({});
  });
});
