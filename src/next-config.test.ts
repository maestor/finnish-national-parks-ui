import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("next.config", () => {
  it("traces the Next config runtime files for the serwist route", () => {
    expect(nextConfig.outputFileTracingIncludes).toEqual({
      "/serwist*": ["./next.config.*", "./node_modules/next/dist/server/config*.js"],
    });
  });

  it("allowlists only the Cloudflare R2 image host for next/image", () => {
    expect(nextConfig.images?.remotePatterns).toEqual([
      {
        protocol: "https",
        hostname: "9a805f60ebd517a6d6ee33654b4f5a4d.r2.cloudflarestorage.com",
      },
    ]);
  });

  it("applies baseline security headers to all routes", async () => {
    const headerRules = await nextConfig.headers?.();
    const allRoutes = headerRules?.find((rule) => rule.source === "/:path*");
    expect(allRoutes).toBeDefined();

    const headers = new Map(allRoutes?.headers.map((header) => [header.key, header.value]));
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Permissions-Policy")).toContain("geolocation=(self)");

    const csp = headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    // Map tiles, the R2 image bucket (also the presigned upload target), and
    // MapLibre web workers must keep working under the policy.
    expect(csp).toContain("https://tile.openstreetmap.org");
    expect(csp).toContain("https://9a805f60ebd517a6d6ee33654b4f5a4d.r2.cloudflarestorage.com");
    expect(csp).toContain("worker-src 'self' blob:");
  });
});
