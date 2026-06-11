import type { Park, VisitWithPark } from "./parks";
import {
  buildVisitedSummaryByParkSlug,
  createEmptyVisitedSummary,
  getAdminMarkerColor,
  getParkTypeDisplayName,
  getVisitStatusColor,
  mergeParksWithVisitSummaries,
  toAdminMapParks,
} from "./parks";

import { describe, expect, it } from "vitest";

const buildPark = (overrides: Partial<Park> = {}): Park =>
  ({
    slug: "pallas",
    name: "Pallas-Yllastunturin kansallispuisto",
    address: "Pallasjärventie 14, 99300 Muonio",
    displayTypeName: null,
    areaKm2: 1020,
    locationLabel: "Pallasjärventie 14",
    logo: null,
    luontoonUrl: null,
    map: null,
    category: { name: "Kansallispuistot", slug: "national-park" },
    establishmentYear: 1938,
    boundingBox: { minLat: 67, minLon: 23, maxLat: 68, maxLon: 24 },
    markerPoint: { lat: 67.5, lon: 23.5 },
    postalCode: "99300",
    postalOffice: "Muonio",
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
    ...overrides,
  }) as Park;

const buildVisit = (overrides: Partial<VisitWithPark> = {}): VisitWithPark =>
  ({
    id: 1,
    visitedOn: "2024-06-01",
    notes: null,
    createdAt: "2024-06-01T10:00:00.000Z",
    updatedAt: "2024-06-01T10:00:00.000Z",
    images: [],
    park: {
      slug: "pallas",
      name: "Pallas-Yllastunturin kansallispuisto",
    },
    ...overrides,
  }) as VisitWithPark;

describe("parks helpers", () => {
  it("creates an empty visited summary for parks without visits", () => {
    expect(createEmptyVisitedSummary()).toEqual({
      lastVisitedOn: null,
      visitCount: 0,
      visited: false,
    });
  });

  it("builds visit summaries by park slug with latest visit dates", () => {
    const visitedSummaryByParkSlug = buildVisitedSummaryByParkSlug([
      buildVisit({
        park: { slug: "pallas", name: "Pallas" },
        visitedOn: "2024-06-01",
      }),
      buildVisit({
        id: 2,
        park: { slug: "pallas", name: "Pallas" },
        visitedOn: "2024-06-12",
      }),
      buildVisit({
        id: 3,
        park: { slug: "hetta", name: "Hetta" },
        visitedOn: "2024-05-20",
      }),
    ]);

    expect(visitedSummaryByParkSlug.get("pallas")).toEqual({
      visited: true,
      visitCount: 2,
      lastVisitedOn: "2024-06-12",
    });
    expect(visitedSummaryByParkSlug.get("hetta")).toEqual({
      visited: true,
      visitCount: 1,
      lastVisitedOn: "2024-05-20",
    });
  });

  it("merges parks with either computed or empty visit summaries", () => {
    const parks = [buildPark(), buildPark({ slug: "hetta", name: "Hetta" })];

    expect(
      mergeParksWithVisitSummaries(parks, [
        buildVisit({
          park: { slug: "pallas", name: "Pallas" },
          visitedOn: "2024-06-12",
        }),
      ]),
    ).toEqual([
      expect.objectContaining({
        slug: "pallas",
        visitedSummary: {
          visited: true,
          visitCount: 1,
          lastVisitedOn: "2024-06-12",
        },
      }),
      expect.objectContaining({
        slug: "hetta",
        visitedSummary: createEmptyVisitedSummary(),
      }),
    ]);
  });

  it("prefers the custom display type name when one exists", () => {
    expect(
      getParkTypeDisplayName(
        buildPark({
          displayTypeName: "Maailmanperintokohde",
          type: { code: 4, id: 4, name: "Muu luonnonsuojelualue", slug: "nature-reserve-area" },
        }),
      ),
    ).toBe("Maailmanperintokohde");

    expect(getParkTypeDisplayName(buildPark())).toBe("Kansallispuisto");
  });

  it("returns visit-status colors for visited and unvisited parks", () => {
    const visitedPark = {
      ...buildPark(),
      visitedSummary: {
        visited: true,
        visitCount: 1,
        lastVisitedOn: "2024-06-12",
      },
    };
    const unvisitedPark = {
      ...buildPark(),
      visitedSummary: createEmptyVisitedSummary(),
    };

    expect(getVisitStatusColor(visitedPark)).toBe("#16a34a");
    expect(getVisitStatusColor(unvisitedPark)).toBe("#64748b");
  });

  it("marks removed parks separately and uses the correct admin marker colors", () => {
    const adminMapParks = toAdminMapParks(
      [buildPark({ slug: "pallas" })],
      [buildPark({ slug: "hetta", name: "Hetta" })],
    );

    expect(adminMapParks).toEqual([
      expect.objectContaining({
        slug: "pallas",
        removed: false,
        visitedSummary: createEmptyVisitedSummary(),
      }),
      expect.objectContaining({
        slug: "hetta",
        removed: true,
        visitedSummary: createEmptyVisitedSummary(),
      }),
    ]);

    const [visiblePark, removedPark] = adminMapParks;

    expect(visiblePark).toBeDefined();
    expect(removedPark).toBeDefined();
    if (!visiblePark || !removedPark) {
      throw new Error("Expected both visible and removed admin parks");
    }

    expect(getAdminMarkerColor(visiblePark)).toBe("#64748b");
    expect(getAdminMarkerColor(removedPark)).toBe("#ef4444");
  });
});
