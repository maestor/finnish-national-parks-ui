import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

const importEnvModule = async () => {
  vi.resetModules();
  vi.doUnmock("@/lib/env");
  vi.doUnmock("./env");
  return import("./env");
};

describe("env", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    vi.doMock("@/lib/env", () => ({
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:3004",
        NEXT_PUBLIC_SITE_URL: "https://reissuvihko.example.com",
        API_KEY: "test-api-key",
        NEXT_PUBLIC_MAP_STYLE_URL: undefined,
        VERCEL_PROJECT_PRODUCTION_URL: undefined,
        VERCEL_URL: undefined,
      },
      siteEnv: {
        NEXT_PUBLIC_SITE_URL: "https://reissuvihko.example.com",
        VERCEL_PROJECT_PRODUCTION_URL: undefined,
        VERCEL_URL: undefined,
      },
    }));
    vi.resetModules();
  });

  it("does not require NEXT_PUBLIC_API_URL when only site metadata env is read", async () => {
    process.env.NEXT_PUBLIC_API_URL = undefined;
    process.env.NEXT_PUBLIC_SITE_URL = "https://reissuvihko.example.com";

    const { siteEnv } = await importEnvModule();

    expect(siteEnv.NEXT_PUBLIC_SITE_URL).toBe("https://reissuvihko.example.com");
  });

  it("accepts host-style site URLs and defaults the auth cookie name", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3004";
    process.env.NEXT_PUBLIC_SITE_URL = "reissuvihko.example.com";
    process.env.AUTH_COOKIE_NAME = undefined;

    const { env } = await importEnvModule();

    expect(env.NEXT_PUBLIC_SITE_URL).toBe("reissuvihko.example.com");
    expect(env.AUTH_COOKIE_NAME).toBe("__session");
  });

  it("throws when required environment variables are invalid", async () => {
    process.env.NEXT_PUBLIC_API_URL = "not-a-url";

    const { env } = await importEnvModule();

    expect(() => env.NEXT_PUBLIC_API_URL).toThrow("Invalid environment variables");
    expect(() => env.NEXT_PUBLIC_API_URL).toThrow(/NEXT_PUBLIC_API_URL/);
  });
});
