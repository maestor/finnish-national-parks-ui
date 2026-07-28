import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { legacyAppRedirects } from "./src/lib/routes";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Public park logos can now load through the backend origin before redirecting
// to Cloudflare R2, while visit images and uploads still hit R2 directly.
// Keep both origins allowlisted in the image policy and remote patterns.
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

const getPublicApiOrigin = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return null;
  }

  try {
    return new URL(apiUrl).origin;
  } catch {
    return null;
  }
};

const buildContentSecurityPolicy = (isProduction: boolean) => {
  const mapStyleOrigin = getMapStyleOrigin();
  const publicApiOrigin = getPublicApiOrigin();
  const externalFetchOrigins = [
    R2_IMAGE_ORIGIN,
    OSM_TILE_ORIGIN,
    ...(publicApiOrigin ? [publicApiOrigin] : []),
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
const publicApiOrigin = getPublicApiOrigin();

const nextConfig: NextConfig = {
  // The /serwist/* route is prerendered at build time, but if it is ever
  // invoked dynamically Vercel still needs the config files traced into the
  // server bundle, since `@serwist/turbopack` loads Next config on startup.
  outputFileTracingIncludes: {
    "/serwist*": ["./next.config.*", "./node_modules/next/dist/server/config*.js"],
  },
  images: {
    // Public logos can load from the backend origin before redirecting to R2.
    // If either image origin changes, update this allowlist and
    // docs/DEVELOPMENT.md in the same change.
    deviceSizes: [640, 750, 828, 1080, 1200, 1536],
    formats: ["image/webp"],
    imageSizes: [64, 80, 112, 144, 192],
    minimumCacheTTL: 2_678_400,
    qualities: [75],
    remotePatterns: [
      new URL(R2_IMAGE_ORIGIN),
      ...(publicApiOrigin ? [new URL(publicApiOrigin)] : []),
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
