import type { paths } from "./api-types";

export type Park =
  paths["/api/parks"]["get"]["responses"][200]["content"]["application/json"]["parks"][number];

export type ParkTypeSlug = Park["type"]["slug"];

export const parkTypeColors: Record<ParkTypeSlug, string> = {
  "national-park": "#16a34a",
  "wilderness-area": "#3b82f6",
  "state-hiking-area": "#f59e0b",
  "other-nature-reserve": "#64748b",
};

export const getParkTypeColor = (slug: ParkTypeSlug): string => parkTypeColors[slug];
