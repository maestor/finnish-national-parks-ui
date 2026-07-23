import { describe, expect, it } from "vitest";
import {
  buildPublicVisitsMapModel,
  buildPublicVisitsTimelineModel,
  createPublicVisitsHref,
  type FrontendTimelineVisit,
  type PublicVisitsMapPark,
  resolvePublicVisitsView,
} from "./public-visits";

const createTimelineVisit = (
  overrides: Partial<FrontendTimelineVisit> & { id: number },
): FrontendTimelineVisit => ({
  visitedOn: "2024-06-15",
  route: null,
  createdAt: "2024-06-15T10:00:00Z",
  imageCount: 0,
  trip: null,
  tripStopOrder: null,
  park: {
    name: "Nuuksio",
    slug: "nuuksio",
    typeLabel: "Kansallispuisto",
  },
  ...overrides,
});

const mapParks: PublicVisitsMapPark[] = [
  {
    slug: "nuuksio",
    name: "Nuuksio",
    markerPoint: { lat: 60.3, lon: 24.5 },
  },
  {
    slug: "pallas-yllastunturi",
    name: "Pallas-Yllästunturi",
    markerPoint: { lat: 68.1, lon: 24.0 },
  },
];

describe("resolvePublicVisitsView", () => {
  it("defaults to the timeline view for missing, unknown, or empty params", () => {
    expect(resolvePublicVisitsView(undefined)).toBe("timeline");
    expect(resolvePublicVisitsView("")).toBe("timeline");
    expect(resolvePublicVisitsView("timeline")).toBe("timeline");
    expect(resolvePublicVisitsView("bogus")).toBe("timeline");
  });

  it("resolves the map view only for the explicit map param", () => {
    expect(resolvePublicVisitsView("map")).toBe("map");
    expect(resolvePublicVisitsView(["map", "timeline"])).toBe("map");
    expect(resolvePublicVisitsView(["bogus", "map"])).toBe("timeline");
  });
});

describe("createPublicVisitsHref", () => {
  it("keeps timeline URLs free of the view param", () => {
    expect(createPublicVisitsHref({})).toBe("/kaynnit");
    expect(createPublicVisitsHref({ view: "timeline" })).toBe("/kaynnit");
    expect(createPublicVisitsHref({ year: 2024, month: 6, view: "timeline" })).toBe(
      "/kaynnit?year=2024&month=6",
    );
  });

  it("keeps map URLs year-only even when a month is present", () => {
    expect(createPublicVisitsHref({ view: "map" })).toBe("/kaynnit?view=map");
    expect(createPublicVisitsHref({ year: 2024, view: "map" })).toBe("/kaynnit?year=2024&view=map");
    expect(createPublicVisitsHref({ year: 2024, month: 6, view: "map" })).toBe(
      "/kaynnit?year=2024&view=map",
    );
  });
});

describe("buildPublicVisitsMapModel", () => {
  const visits: FrontendTimelineVisit[] = [
    createTimelineVisit({ id: 1, visitedOn: "2023-07-10" }),
    createTimelineVisit({ id: 2, visitedOn: "2024-06-15" }),
    createTimelineVisit({ id: 3, visitedOn: "2024-08-20" }),
    createTimelineVisit({
      id: 4,
      visitedOn: "2024-06-01",
      park: {
        name: "Pallas-Yllästunturi",
        slug: "pallas-yllastunturi",
        typeLabel: "Kansallispuisto",
      },
    }),
    // A hidden park is absent from the map summary: the visit stays in the
    // timeline counts but cannot be placed on the map.
    createTimelineVisit({
      id: 5,
      visitedOn: "2024-09-05",
      park: {
        name: "Piilotettu",
        slug: "piilotettu",
        typeLabel: "Kansallispuisto",
      },
    }),
  ];

  it("aggregates one marker per visited park with coordinates, counts, and visit years", () => {
    const markers = buildPublicVisitsMapModel(visits, mapParks, {
      selectedYear: null,
      selectedMonth: null,
    });

    expect(markers).toEqual([
      {
        slug: "nuuksio",
        name: "Nuuksio",
        coordinates: { lat: 60.3, lon: 24.5 },
        visitCount: 3,
        years: [2023, 2024],
      },
      {
        slug: "pallas-yllastunturi",
        name: "Pallas-Yllästunturi",
        coordinates: { lat: 68.1, lon: 24.0 },
        visitCount: 1,
        years: [2024],
      },
    ]);
  });

  it("skips visits whose park is missing from the map summary", () => {
    const markers = buildPublicVisitsMapModel(visits, mapParks, {
      selectedYear: null,
      selectedMonth: null,
    });

    expect(markers.some((marker) => marker.slug === "piilotettu")).toBe(false);
  });

  it("filters markers by the selected year and month", () => {
    const yearMarkers = buildPublicVisitsMapModel(visits, mapParks, {
      selectedYear: 2024,
      selectedMonth: null,
    });

    expect(
      yearMarkers.map((marker) => ({ slug: marker.slug, visitCount: marker.visitCount })),
    ).toEqual([
      { slug: "nuuksio", visitCount: 2 },
      { slug: "pallas-yllastunturi", visitCount: 1 },
    ]);
    expect(yearMarkers[0]?.years).toEqual([2024]);

    const monthMarkers = buildPublicVisitsMapModel(visits, mapParks, {
      selectedYear: 2024,
      selectedMonth: 6,
    });

    expect(monthMarkers.map((marker) => marker.slug)).toEqual(["nuuksio", "pallas-yllastunturi"]);
  });

  it("sorts markers by visit count and then by Finnish park name", () => {
    const markers = buildPublicVisitsMapModel(visits, mapParks, {
      selectedYear: 2024,
      selectedMonth: 6,
    });

    expect(markers[0]?.visitCount).toBeGreaterThanOrEqual(markers[1]?.visitCount ?? 0);
  });

  it("returns no markers when nothing matches the selection", () => {
    expect(
      buildPublicVisitsMapModel(visits, mapParks, { selectedYear: 2025, selectedMonth: null }),
    ).toEqual([]);
  });
});

describe("buildPublicVisitsTimelineModel", () => {
  it("groups trips into one timeline item positioned by the latest trip visit", () => {
    const model = buildPublicVisitsTimelineModel(
      [
        createTimelineVisit({
          id: 1,
          visitedOn: "2024-06-15",
          trip: { id: 7, name: "Kesaretki", slug: "kesaretki" },
        }),
        createTimelineVisit({
          id: 2,
          visitedOn: "2024-06-18",
          route: "Harjupolku",
          imageCount: 2,
          trip: { id: 7, name: "Kesaretki", slug: "kesaretki" },
        }),
        createTimelineVisit({
          id: 3,
          visitedOn: "2024-06-20",
          park: {
            name: "Repovesi",
            slug: "repovesi",
            typeLabel: "Kansallispuisto",
          },
        }),
      ],
      {
        selectedYear: null,
        selectedMonth: null,
      },
    );

    expect(model.filteredVisits).toHaveLength(3);
    expect(model.sections).toHaveLength(1);
    expect(model.sections[0]?.months).toHaveLength(1);
    expect(model.sections[0]?.months[0]?.items).toHaveLength(2);

    const [latestLooseVisit, groupedTrip] = model.sections[0]?.months[0]?.items ?? [];

    expect(latestLooseVisit).toMatchObject({
      kind: "visit",
      visit: {
        id: 3,
      },
    });
    expect(groupedTrip).toMatchObject({
      kind: "trip",
      tripId: 7,
      name: "Kesaretki",
      visitCount: 2,
      parkCount: 1,
      imageCount: 2,
      dateRange: {
        start: "2024-06-15",
        end: "2024-06-18",
      },
      latestVisit: {
        id: 2,
      },
    });

    if (groupedTrip?.kind !== "trip") {
      throw new Error("Expected grouped trip item");
    }

    expect(groupedTrip.visits.map((visit) => visit.id)).toEqual([1, 2]);
  });

  it("uses trip stop order for visits inside a grouped trip", () => {
    const model = buildPublicVisitsTimelineModel(
      [
        createTimelineVisit({
          id: 1,
          visitedOn: "2024-06-15",
          createdAt: "2024-06-15T09:00:00Z",
          trip: { id: 7, name: "Kesaretki", slug: "kesaretki" },
          tripStopOrder: 2,
        }),
        createTimelineVisit({
          id: 2,
          visitedOn: "2024-06-15",
          createdAt: "2024-06-15T12:00:00Z",
          park: {
            name: "Pallas-Yllästunturi",
            slug: "pallas-yllastunturi",
            typeLabel: "Kansallispuisto",
          },
          trip: { id: 7, name: "Kesaretki", slug: "kesaretki" },
          tripStopOrder: 1,
        }),
      ],
      {
        selectedYear: null,
        selectedMonth: null,
      },
    );

    const groupedTrip = model.sections[0]?.months[0]?.items[0];

    if (groupedTrip?.kind !== "trip") {
      throw new Error("Expected grouped trip item");
    }

    expect(groupedTrip.visits.map((visit) => visit.id)).toEqual([2, 1]);
  });

  it("keeps only the matching year slice inside a trip when filtered", () => {
    const model = buildPublicVisitsTimelineModel(
      [
        createTimelineVisit({
          id: 1,
          visitedOn: "2024-12-30",
          trip: { id: 7, name: "Uudenvuoden reissu", slug: "uudenvuoden-reissu" },
        }),
        createTimelineVisit({
          id: 2,
          visitedOn: "2025-01-02",
          park: {
            name: "Oulanka",
            slug: "oulanka",
            typeLabel: "Kansallispuisto",
          },
          trip: { id: 7, name: "Uudenvuoden reissu", slug: "uudenvuoden-reissu" },
        }),
      ],
      {
        selectedYear: 2025,
        selectedMonth: null,
      },
    );

    expect(model.filteredVisits).toHaveLength(1);
    expect(model.sections).toHaveLength(1);
    expect(model.sections[0]?.year).toBe(2025);

    const groupedTrip = model.sections[0]?.months[0]?.items[0];

    expect(groupedTrip).toMatchObject({
      kind: "trip",
      tripId: 7,
      visitCount: 1,
      parkCount: 1,
      dateRange: {
        start: "2025-01-02",
        end: "2025-01-02",
      },
    });

    if (groupedTrip?.kind !== "trip") {
      throw new Error("Expected grouped trip item");
    }

    expect(groupedTrip.visits.map((visit) => visit.id)).toEqual([2]);
  });
});
