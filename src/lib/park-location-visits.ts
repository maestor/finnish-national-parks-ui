import type { Visit } from "@/lib/parks";

export const getParkLocationVisits = (locations: { slug: string }[], visits: Visit[]) => {
  const result = new Map<string, { id: number; visitedOn: string }[]>();
  for (const location of locations) result.set(location.slug, []);
  for (const visit of visits) {
    for (const { slug } of [...(visit.trails ?? []), ...(visit.areas ?? [])]) {
      const entries = result.get(slug);
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
