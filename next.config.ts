import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // `@serwist/turbopack` loads Next config at route runtime, so Vercel needs
  // those files traced into the `/serwist/*` server bundle.
  outputFileTracingIncludes: {
    "/serwist*": ["./next.config.*", "./node_modules/next/dist/server/config*.js"],
  },
};

export default withSerwist(withNextIntl(nextConfig));
