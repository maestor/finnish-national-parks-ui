import type { ParkDetail, Visit } from "@/lib/parks";

export const getParkTrailVisits = (
  trails: NonNullable<ParkDetail["linkedTrails"]>,
  visits: Visit[],
) => {
  const result = new Map<string, { id: number; visitedOn: string }[]>();
  for (const trail of trails) result.set(trail.slug, []);
  for (const visit of visits) {
    for (const trail of visit.trails ?? []) {
      const entries = result.get(trail.slug);
      if (entries && !entries.some((entry) => entry.id === visit.id)) {
        entries.push({ id: visit.id, visitedOn: visit.visitedOn });
      }
    }
  }
  for (const entries of result.values()) {
    entries.sort((a, b) => b.visitedOn.localeCompare(a.visitedOn) || a.id - b.id);
  }
  return result;
};
