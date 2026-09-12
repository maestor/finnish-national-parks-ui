import { afterEach, describe, expect, it } from "vitest";
import { siteEnv } from "./env";
import { resolveMetadataBase, siteUrl } from "./site-url";

const original = { ...siteEnv };
afterEach(() => Object.assign(siteEnv, original));

describe("canonical site origin", () => {
  it("uses the configured origin instead of deployment aliases and strips paths", () => {
    Object.assign(siteEnv, {
      NEXT_PUBLIC_SITE_URL: "https://reissuvihko.fi/path?query=value",
      VERCEL_PROJECT_PRODUCTION_URL: "production.vercel.app",
      VERCEL_URL: "preview.vercel.app",
    });
    expect(siteUrl("/sitemap.xml")).toBe("https://reissuvihko.fi/sitemap.xml");
  });

  it("prefers the production host over a preview host when no custom origin is set", () => {
    Object.assign(siteEnv, {
      NEXT_PUBLIC_SITE_URL: undefined,
      VERCEL_PROJECT_PRODUCTION_URL: "production.vercel.app",
      VERCEL_URL: "preview.vercel.app",
    });
    expect(resolveMetadataBase().href).toBe("https://production.vercel.app/");
  });

  it("supports a standalone Vercel deployment and local development", () => {
    Object.assign(siteEnv, {
      NEXT_PUBLIC_SITE_URL: undefined,
      VERCEL_PROJECT_PRODUCTION_URL: undefined,
      VERCEL_URL: "preview.vercel.app",
    });
    expect(siteUrl("/robots.txt")).toBe("https://preview.vercel.app/robots.txt");
    siteEnv.VERCEL_URL = undefined;
    expect(siteUrl("/robots.txt")).toBe("http://localhost:4300/robots.txt");
  });
});
