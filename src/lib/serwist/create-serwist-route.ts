import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getFileManifestEntries, rebasePath } from "@serwist/build";
import { browserslistToEsbuild } from "@serwist/utils";
import browserslist from "browserslist";
import { MODERN_BROWSERSLIST_TARGET } from "next/constants.js";
import { NextResponse } from "next/server.js";

type ManifestEntryLike = {
  integrity?: string;
  revision?: string | null;
  size: number;
  url: string;
};

type RouteBuildResult = {
  count: number;
  manifestEntries?: ManifestEntryLike[];
  size: number;
  warnings: string[];
};

type EsbuildModule = {
  build: (options: Record<string, unknown>) => Promise<{
    errors: unknown[];
    outputFiles: Array<{
      path: string;
      text: string;
    }>;
    warnings: unknown[];
  }>;
};

type MinimalNextConfig = {
  assetPrefix?: string;
  basePath?: string;
  distDir?: string;
};

type InjectManifestOptions = {
  additionalPrecacheEntries?: unknown[];
  cwd?: string;
  dontCacheBustURLsMatching?: RegExp;
  esbuildOptions?: Record<string, unknown>;
  globDirectory?: string;
  globFollow?: boolean;
  globIgnores?: string[];
  globPatterns?: string[];
  globStrict?: boolean;
  injectionPoint?: string;
  manifestTransforms?: Array<
    (manifestEntries: ManifestEntryLike[]) =>
      | Promise<{
          manifest: ManifestEntryLike[];
          warnings: string[];
        }>
      | {
          manifest: ManifestEntryLike[];
          warnings: string[];
        }
  >;
  maximumFileSizeToCacheInBytes?: number;
  nextConfig?: MinimalNextConfig;
  rebuildOnChange?: boolean;
  swSrc: string;
  useNativeEsbuild?: boolean;
  [key: string]: unknown;
};

const normalizeNextConfig = (nextConfig?: MinimalNextConfig) => {
  let distDir = nextConfig?.distDir ?? ".next";

  if (distDir.startsWith("/")) {
    distDir = distDir.slice(1);
  }

  if (!distDir.endsWith("/")) {
    distDir += "/";
  }

  return {
    assetPrefix: nextConfig?.assetPrefix ?? "",
    basePath: nextConfig?.basePath || "/",
    distDir,
  };
};

const generateGlobPatterns = (distDir: string) => [
  `${distDir}static/**/*.{js,css,html,ico,apng,png,avif,jpg,jpeg,jfif,pjpeg,pjp,gif,svg,webp,json,webmanifest}`,
  "public/**/*",
];

type ResolvedRouteOptions = Omit<InjectManifestOptions, "nextConfig" | "swSrc"> & {
  cwd: string;
  dontCacheBustURLsMatching: RegExp;
  esbuildOptions: Record<string, unknown>;
  globDirectory: string;
  globFollow: boolean;
  globIgnores: string[];
  globPatterns: string[];
  globStrict: boolean;
  injectionPoint: string;
  maximumFileSizeToCacheInBytes: number;
  nextConfig: Required<MinimalNextConfig>;
  rebuildOnChange: boolean;
  swSrc: string;
  useNativeEsbuild: boolean;
};

let esbuildWasm: Promise<unknown> | null = null;

const isDev = process.env.NODE_ENV === "development";

const contentTypeMap: Record<string, string> = {
  ".js": "application/javascript",
  ".map": "application/json; charset=UTF-8",
};

export const resolveSerwistRouteConfig = async (input: InjectManifestOptions) => {
  if (!input.swSrc) {
    throw new Error("Serwist route requires swSrc.");
  }

  const cwd = input.cwd ?? process.cwd();
  const nextConfig = normalizeNextConfig(input.nextConfig);

  return {
    ...input,
    cwd,
    dontCacheBustURLsMatching:
      input.dontCacheBustURLsMatching ?? new RegExp(`^${nextConfig.distDir}static/`),
    esbuildOptions: (input.esbuildOptions as Record<string, unknown> | undefined) ?? {},
    globDirectory: input.globDirectory ?? cwd,
    globFollow: input.globFollow ?? true,
    globIgnores: input.globIgnores ?? ["**/node_modules/**/*"],
    globPatterns: input.globPatterns ?? generateGlobPatterns(nextConfig.distDir),
    globStrict: input.globStrict ?? true,
    injectionPoint: input.injectionPoint ?? "self.__SW_MANIFEST",
    maximumFileSizeToCacheInBytes: input.maximumFileSizeToCacheInBytes ?? 2097152,
    nextConfig,
    rebuildOnChange: input.rebuildOnChange ?? true,
    swSrc: path.isAbsolute(input.swSrc) ? input.swSrc : path.join(cwd, input.swSrc),
    useNativeEsbuild: input.useNativeEsbuild ?? process.platform === "win32",
  } satisfies ResolvedRouteOptions;
};

const toBuildConfig = async (input: InjectManifestOptions) => {
  const config = await resolveSerwistRouteConfig(input);

  return {
    ...config,
    additionalPrecacheEntries: isDev ? [] : config.additionalPrecacheEntries,
    disablePrecacheManifest: isDev,
    globIgnores: [
      ...config.globIgnores,
      rebasePath({
        file: config.swSrc,
        baseDirectory: config.globDirectory,
      }),
    ],
    manifestTransforms: [
      ...(config.manifestTransforms ?? []),
      async (manifestEntries: ManifestEntryLike[]) => {
        const manifest = manifestEntries.map((entry) => {
          if (entry.url.startsWith(config.nextConfig.distDir)) {
            entry.url = `${config.nextConfig.assetPrefix}/_next/${entry.url.slice(
              config.nextConfig.distDir.length,
            )}`;
          }

          if (entry.url.startsWith("public/")) {
            entry.url = path.posix.join(config.nextConfig.basePath, entry.url.slice(7));
          }

          return entry;
        });

        return { manifest, warnings: [] };
      },
    ],
  };
};

const loadBundleMap = async (
  filePath: string,
  config: Awaited<ReturnType<typeof toBuildConfig>>,
) => {
  const buildResult = (await getFileManifestEntries(
    config as Parameters<typeof getFileManifestEntries>[0],
  )) as RouteBuildResult;
  const manifestString =
    buildResult.manifestEntries === undefined
      ? "undefined"
      : JSON.stringify(buildResult.manifestEntries, null, 2);
  const injectionPoint = config.injectionPoint || "";
  if (config.useNativeEsbuild) {
    throw new Error("Native esbuild is not supported by this Serwist route.");
  }

  if (!esbuildWasm) {
    esbuildWasm = import(/* webpackIgnore: true */ "esbuild-wasm");
  }

  const esbuild = (await esbuildWasm) as EsbuildModule;

  const esbuildOptions = config.esbuildOptions as Record<string, unknown>;
  const define =
    typeof esbuildOptions.define === "object" && esbuildOptions.define !== null
      ? (esbuildOptions.define as Record<string, string>)
      : {};
  const result = await esbuild.build({
    sourcemap: true,
    format: "esm",
    treeShaking: true,
    minify: !isDev,
    bundle: true,
    ...esbuildOptions,
    target:
      esbuildOptions.target ??
      browserslistToEsbuild(browserslist, config.cwd, MODERN_BROWSERSLIST_TARGET),
    platform: "browser",
    define: {
      ...define,
      ...(injectionPoint ? { [injectionPoint]: manifestString } : {}),
    },
    outdir: config.cwd,
    write: false,
    entryNames: "[name]",
    assetNames: "[name]-[hash]",
    chunkNames: "[name]-[hash]",
    entryPoints: [{ in: config.swSrc, out: "sw" }],
  });

  if (result.errors.length) {
    console.error("Failed to build the service worker.", result.errors);
    throw new Error(`Failed to build Serwist asset for ${filePath}`);
  }

  if (result.warnings.length) {
    console.warn(result.warnings);
  }

  return new Map(
    result.outputFiles.map((outputFile: { path: string; text: string }) => [
      outputFile.path,
      outputFile.text,
    ]),
  );
};

export const createSerwistRoute = (options: InjectManifestOptions) => {
  const dynamic = "force-static" as const;
  const dynamicParams = false as const;
  const revalidate = false as const;
  const configPromise = toBuildConfig(options);
  let lastHash: string | null = null;
  let map: Map<string, string> | null = null;

  const ensureMap = async (filePath: string) => {
    const config = await configPromise;

    if (isDev && config.rebuildOnChange) {
      const swContent = fs.readFileSync(config.swSrc, "utf-8");
      const currentHash = crypto.createHash("sha256").update(swContent).digest("hex");

      if (!map || lastHash !== currentHash) {
        map = await loadBundleMap(filePath, config);
        lastHash = currentHash;
      }
    } else if (!map) {
      map = await loadBundleMap(filePath, config);
    }

    if (!map) {
      throw new Error("Failed to create Serwist asset map.");
    }

    return { config, map };
  };

  const generateStaticParams = async () => {
    const { config, map } = await ensureMap("root");

    return [...map.keys()].map((entry) => ({
      path: path.relative(config.cwd, entry),
    }));
  };

  const GET = async (_request: Request, { params }: { params: Promise<{ path: string }> }) => {
    const { path: filePath } = await params;
    const { config, map } = await ensureMap(filePath);

    return new NextResponse(map.get(path.join(config.cwd, filePath)), {
      headers: {
        "Content-Type": contentTypeMap[path.extname(filePath)] || "text/plain",
        "Service-Worker-Allowed": "/",
      },
    });
  };

  return { dynamic, dynamicParams, revalidate, generateStaticParams, GET };
};
