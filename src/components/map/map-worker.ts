import { setWorkerUrl } from "maplibre-gl";

// MapLibre GL v6 ships ESM-only, and inside the Next.js/Turbopack module graph
// it cannot auto-detect the worker URL. Point it at the self-hosted worker that
// scripts/copy-maplibre-worker.mjs syncs into public/maplibre/ (wired to
// predev/prebuild). Without this the map cannot load tiles in bundled builds.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
