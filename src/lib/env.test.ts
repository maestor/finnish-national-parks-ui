import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

describe("siteEnv", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("does not require NEXT_PUBLIC_API_URL when only site metadata env is read", async () => {
    process.env.NEXT_PUBLIC_API_URL = undefined;
    process.env.NEXT_PUBLIC_SITE_URL = "https://reissuvihko.example.com";

    const { siteEnv } = await import("./env");

    expect(siteEnv.NEXT_PUBLIC_SITE_URL).toBe("https://reissuvihko.example.com");
  });
});
