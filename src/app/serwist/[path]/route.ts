import { createSerwistRoute } from "@/lib/serwist/create-serwist-route";

export const { GET } = createSerwistRoute({
  // Keep these in sync if distDir/basePath/assetPrefix ever change in next.config.ts.
  nextConfig: {
    assetPrefix: "",
    basePath: "/",
    distDir: ".next",
  },
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: false,
});
