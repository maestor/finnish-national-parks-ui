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
});
