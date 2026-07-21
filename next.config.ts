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
  redirects: async () => [...legacyAppRedirects],
};

export default withSerwist(withNextIntl(nextConfig));
