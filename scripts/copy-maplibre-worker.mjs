import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// MapLibre GL v6 is ESM-only, and bundlers cannot auto-detect its worker URL,
// so the app self-hosts the worker and its shared chunk from public/maplibre/
// (see src/components/map/map-worker.ts). This script keeps those copies in
// sync with the installed maplibre-gl version and runs via predev/prebuild.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(repoRoot, "node_modules", "maplibre-gl", "dist");
const targetDir = join(repoRoot, "public", "maplibre");

mkdirSync(targetDir, { recursive: true });

for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(distDir, file), join(targetDir, file));
}
