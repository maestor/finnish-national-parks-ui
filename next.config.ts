import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { legacyAppRedirects } from "./src/lib/routes";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The /serwist/* route is prerendered at build time, but if it is ever
  // invoked dynamically Vercel still needs the config files traced into the
  // server bundle, since `@serwist/turbopack` loads Next config on startup.
  outputFileTracingIncludes: {
    "/serwist*": ["./next.config.*", "./node_modules/next/dist/server/config*.js"],
  },
  images: {
    // All park logos and visit images are served from the backend's
    // Cloudflare R2 bucket. Keep this allowlist to that single origin; if the
    // backend moves image hosting (for example to a custom R2 domain), update
    // this entry and docs/DEVELOPMENT.md in the same change.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "9a805f60ebd517a6d6ee33654b4f5a4d.r2.cloudflarestorage.com",
      },
    ],
  },
  redirects: async () => [...legacyAppRedirects],
};

export default withSerwist(withNextIntl(nextConfig));
