import { hasRemoteMatch } from "next/dist/shared/lib/match-remote-pattern";
import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_API_URL = process.env.NEXT_PUBLIC_API_URL;

const loadNextConfig = async (apiUrl?: string) => {
  if (apiUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
  } else {
    process.env.NEXT_PUBLIC_API_URL = apiUrl;
  }

  vi.resetModules();
  return (await import("../next.config")).default;
};

afterEach(() => {
  if (ORIGINAL_API_URL === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
  } else {
    process.env.NEXT_PUBLIC_API_URL = ORIGINAL_API_URL;
  }
});

describe("next.config", () => {
  it("traces the Next config runtime files for the serwist route", async () => {
    const nextConfig = await loadNextConfig();

    expect(nextConfig.outputFileTracingIncludes).toEqual({
      "/serwist*": ["./next.config.*", "./node_modules/next/dist/server/config*.js"],
    });
  });

  it("allowlists the R2 image host and the configured backend origin for next/image", async () => {
    const nextConfig = await loadNextConfig("https://reissuvihko-api.vercel.app");
    const remotePatterns = nextConfig.images?.remotePatterns ?? [];
    const signedVisitImageUrl = new URL(
      "https://9a805f60ebd517a6d6ee33654b4f5a4d.r2.cloudflarestorage.com/finnish-parks-images/visits/178/de149480-9616-42e4-939e-d70748f0ffd2.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20260729T163249Z&X-Amz-Expires=3600&X-Amz-Signature=8fdc4db982e0d7d48cca03dd5f47fc7eb5012d9e38b9241442c74f4860368b72&X-Amz-SignedHeaders=host&x-id=GetObject",
    );

    expect(nextConfig.images).toMatchObject({
      deviceSizes: [640, 750, 828, 1080, 1200, 1536],
      formats: ["image/webp"],
      imageSizes: [64, 80, 112, 144, 192],
      minimumCacheTTL: 2_678_400,
      qualities: [75],
    });

    expect(remotePatterns).toEqual([
      {
        protocol: "https",
        hostname: "9a805f60ebd517a6d6ee33654b4f5a4d.r2.cloudflarestorage.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "reissuvihko-api.vercel.app",
        port: "",
      },
    ]);
    expect(hasRemoteMatch([], remotePatterns, signedVisitImageUrl)).toBe(true);
  });

  it("applies baseline security headers to all routes", async () => {
    const nextConfig = await loadNextConfig("https://reissuvihko-api.vercel.app");
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
    expect(csp).toContain("https://tile.openstreetmap.org");
    expect(csp).toContain("https://9a805f60ebd517a6d6ee33654b4f5a4d.r2.cloudflarestorage.com");
    expect(csp).toContain("https://reissuvihko-api.vercel.app");
    expect(csp).toContain("worker-src 'self' blob:");
  });
});
