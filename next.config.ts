import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { legacyAppRedirects } from "./src/lib/routes";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// All park logos and visit images are served from the backend's Cloudflare R2
// bucket. The browser also PUTs directly to this origin during presigned
// uploads, so it must stay allowed in both images.remotePatterns and the CSP.
const R2_IMAGE_ORIGIN = "https://9a805f60ebd517a6d6ee33654b4f5a4d.r2.cloudflarestorage.com";
const OSM_TILE_ORIGIN = "https://tile.openstreetmap.org";

const getMapStyleOrigin = () => {
  const mapStyleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
  if (!mapStyleUrl) {
    return null;
  }

  try {
    return new URL(mapStyleUrl).origin;
  } catch {
    return null;
  }
};

const buildContentSecurityPolicy = (isProduction: boolean) => {
  const mapStyleOrigin = getMapStyleOrigin();
  const externalFetchOrigins = [
    R2_IMAGE_ORIGIN,
    OSM_TILE_ORIGIN,
    ...(mapStyleOrigin ? [mapStyleOrigin] : []),
  ].join(" ");

  const directives = [
    "default-src 'self'",
    // Next.js bootstraps hydration with inline scripts and next-themes injects
    // an inline theme script, so 'unsafe-inline' is required until the app
    // moves to a nonce-based policy. 'unsafe-eval' is a dev-only need (HMR).
    `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${externalFetchOrigins}`,
    `connect-src 'self' ${externalFetchOrigins}${isProduction ? "" : " ws:"}`,
    // MapLibre GL v6 loads its tile-pipeline worker from the self-hosted ESM
    // file under /maplibre/ ('self'); blob: stays allowed for worker fallbacks.
    "worker-src 'self' blob:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (isProduction) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
};

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // The /serwist/* route is prerendered at build time, but if it is ever
  // invoked dynamically Vercel still needs the config files traced into the
  // server bundle, since `@serwist/turbopack` loads Next config on startup.
  outputFileTracingIncludes: {
    "/serwist*": ["./next.config.*", "./node_modules/next/dist/server/config*.js"],
  },
  images: {
    // Keep this allowlist to the single R2 origin; if the backend moves image
    // hosting (for example to a custom R2 domain), update R2_IMAGE_ORIGIN and
    // docs/DEVELOPMENT.md in the same change.
    remotePatterns: [
      {
        protocol: "https",
        hostname: new URL(R2_IMAGE_ORIGIN).hostname,
      },
    ],
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: buildContentSecurityPolicy(isProduction) },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        // HSTS only makes sense on the real HTTPS deployment, not local HTTP.
        ...(isProduction
          ? [
              {
                key: "Strict-Transport-Security",
                value: "max-age=63072000; includeSubDomains",
              },
            ]
          : []),
      ],
    },
  ],
  redirects: async () => [...legacyAppRedirects],
};

export default withSerwist(withNextIntl(nextConfig));
