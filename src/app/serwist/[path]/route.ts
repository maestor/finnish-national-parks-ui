import { createSerwistRoute } from "@serwist/turbopack";

// Export the full route config (not just GET) so Next.js prerenders
// /serwist/sw.js at build time. Without this the route stays dynamic and
// tries to bundle sw.ts with esbuild at request time, which crashes in
// production where esbuild (a devDependency) is not available.
export const { GET, dynamic, dynamicParams, revalidate, generateStaticParams } = createSerwistRoute(
  {
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
  },
);
