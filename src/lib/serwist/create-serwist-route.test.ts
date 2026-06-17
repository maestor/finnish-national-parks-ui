import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { browserslistToEsbuildMock, esbuildBuildMock, getFileManifestEntriesMock } = vi.hoisted(
  () => ({
    browserslistToEsbuildMock: vi.fn(() => ["chrome100"]),
    esbuildBuildMock: vi.fn(),
    getFileManifestEntriesMock: vi.fn(),
  }),
);

vi.mock("@serwist/build", () => ({
  getFileManifestEntries: getFileManifestEntriesMock,
  rebasePath: ({ file, baseDirectory }: { file: string; baseDirectory: string }) =>
    path.relative(baseDirectory, file),
}));

vi.mock("@serwist/utils", () => ({
  browserslistToEsbuild: browserslistToEsbuildMock,
}));

vi.mock("browserslist", () => ({
  default: {},
}));

vi.mock("esbuild-wasm", () => ({
  build: esbuildBuildMock,
}));

import { createSerwistRoute, resolveSerwistRouteConfig } from "./create-serwist-route";

describe("createSerwistRoute", () => {
  beforeEach(() => {
    browserslistToEsbuildMock.mockClear();
    esbuildBuildMock.mockReset();
    getFileManifestEntriesMock.mockReset();
  });

  it("normalizes the minimal Next config without loading Next internals", async () => {
    const config = await resolveSerwistRouteConfig({
      swSrc: "src/app/sw.ts",
      useNativeEsbuild: false,
    });

    expect(config.nextConfig).toEqual({
      assetPrefix: "",
      basePath: "/",
      distDir: ".next/",
    });
    expect(config.globPatterns).toEqual([
      ".next/static/**/*.{js,css,html,ico,apng,png,avif,jpg,jpeg,jfif,pjpeg,pjp,gif,svg,webp,json,webmanifest}",
      "public/**/*",
    ]);
    expect(config.globDirectory).toBe(process.cwd());
  });

  it("serves the generated service worker bundle with the expected headers", async () => {
    getFileManifestEntriesMock.mockResolvedValue({
      count: 1,
      manifestEntries: [{ revision: "rev-1", size: 64, url: ".next/static/main.js" }],
      size: 128,
      warnings: [],
    });
    esbuildBuildMock.mockResolvedValue({
      errors: [],
      outputFiles: [
        {
          path: path.join(process.cwd(), "sw.js"),
          text: 'console.log("sw");',
        },
        {
          path: path.join(process.cwd(), "sw-CHUNK.js"),
          text: 'console.log("chunk");',
        },
      ],
      warnings: [],
    });

    const { GET, generateStaticParams } = createSerwistRoute({
      swSrc: "src/app/sw.ts",
      useNativeEsbuild: false,
    });

    const staticParams = await generateStaticParams();
    const response = await GET(new Request("http://localhost/serwist/sw.js"), {
      params: Promise.resolve({ path: "sw.js" }),
    });
    const buildConfig = getFileManifestEntriesMock.mock.calls[0]?.[0];
    const transform = buildConfig?.manifestTransforms?.at(-1);
    const transformed = transform
      ? await transform([
          { revision: "rev-1", size: 64, url: ".next/static/main.js" },
          { revision: "rev-2", size: 32, url: "public/icons/icon-32x32.png" },
        ])
      : null;

    expect(staticParams).toEqual([{ path: "sw.js" }, { path: "sw-CHUNK.js" }]);
    expect(await response.text()).toBe('console.log("sw");');
    expect(response.headers.get("Content-Type")).toBe("application/javascript");
    expect(response.headers.get("Service-Worker-Allowed")).toBe("/");
    expect(browserslistToEsbuildMock).toHaveBeenCalled();
    expect(buildConfig).toMatchObject({
      globDirectory: process.cwd(),
      nextConfig: {
        assetPrefix: "",
        basePath: "/",
        distDir: ".next/",
      },
      swSrc: path.join(process.cwd(), "src/app/sw.ts"),
      useNativeEsbuild: false,
    });
    expect(buildConfig.globIgnores).toContain("src/app/sw.ts");
    expect(transformed).toEqual({
      manifest: [
        { revision: "rev-1", size: 64, url: "/_next/static/main.js" },
        { revision: "rev-2", size: 32, url: "/icons/icon-32x32.png" },
      ],
      warnings: [],
    });
  });

  it("fails fast if native esbuild is requested", async () => {
    getFileManifestEntriesMock.mockResolvedValue({
      count: 0,
      manifestEntries: [],
      size: 0,
      warnings: [],
    });

    const { generateStaticParams } = createSerwistRoute({
      swSrc: "src/app/sw.ts",
      useNativeEsbuild: true,
    });

    await expect(generateStaticParams()).rejects.toThrow(
      "Native esbuild is not supported by this Serwist route.",
    );
  });
});
