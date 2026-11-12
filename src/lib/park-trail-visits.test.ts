import { describe, expect, it } from "vitest";
import type { ParkDetail, Visit } from "@/lib/parks";
import { getParkTrailVisits } from "./park-trail-visits";

describe("getParkTrailVisits", () => {
  it("keeps only current trail slugs, deduplicates IDs, and orders same-day visits deterministically", () => {
    const trails = [{ slug: "member" }] as NonNullable<ParkDetail["linkedTrails"]>;
    const link = { id: 1, slug: "member", name: "Same" };
    const visits = [
      { id: 3, visitedOn: "2025-01-01", trails: [link, link] },
      { id: 2, visitedOn: "2025-01-01", trails: [link] },
      { id: 1, visitedOn: "2020-01-01", trails: [link] },
      { id: 4, visitedOn: "2026-01-01", trails: [{ ...link, slug: "removed" }], route: "Same" },
      { id: 5, visitedOn: "2027-01-01" },
    ] as Visit[];
    expect([...getParkTrailVisits(trails, visits)]).toEqual([
      [
        "member",
        [
          { id: 2, visitedOn: "2025-01-01" },
          { id: 3, visitedOn: "2025-01-01" },
          { id: 1, visitedOn: "2020-01-01" },
        ],
      ],
    ]);
    expect(getParkTrailVisits([], visits).size).toBe(0);
  });
});
