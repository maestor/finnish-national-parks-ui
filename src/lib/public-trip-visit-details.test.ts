import { describe, expect, it } from "vitest";
import type { ParkVisits } from "./parks";
import {
  buildPublicTripVisitDetailsResponse,
  collectTripVisitDetailTargets,
  createTripItineraryItemKey,
  tripStopHasExpandableDetails,
  tripVisitHasExpandableDetails,
} from "./public-trip-visit-details";
import type { PublicTripDetail } from "./trips";

const trip: PublicTripDetail = {
  id: 7,
  name: "Kesaretki",
  slug: "kesaretki",
  description: "Kesäinen kierros pohjoiseen.",
  startingPoint: null,
  visitCount: 2,
  stopCount: 1,
  imageCount: 3,
  dateRange: {
    start: "2024-06-15",
    end: "2024-06-18",
  },
  createdAt: "2024-06-18T10:00:00Z",
  updatedAt: "2024-06-18T10:00:00Z",
  route: {
    success: true,
    error: null,
    data: null,
  },
  itinerary: [
    {
      kind: "visit",
      tripStopOrder: 1,
      visit: {
        id: 11,
        author: null,
        createdAt: "2024-06-15T10:00:00Z",
        excludeFromRoute: false,
        location: null,
        note: "Aamupäivän kierros",
        park: {
          name: "Nuuksio",
          slug: "nuuksio",
          markerPoint: {
            lat: 60.31,
            lon: 24.53,
          },
          typeLabel: "Kansallispuisto",
        },
        route: "Punarinnankierros",
        updatedAt: "2024-06-15T10:00:00Z",
        visitedOn: "2024-06-15",
        imageCount: 1,
      },
    },
    {
      kind: "stop",
      tripStopOrder: 2,
      stop: {
        id: 31,
        createdAt: "2024-06-16T10:00:00Z",
        location: {
          displayName: "Yöpyminen Oulussa",
          label: "Yöpyminen Oulussa",
          coordinate: {
            lat: 65.0121,
            lon: 25.4651,
          },
        },
        note: "Hotelli keskustassa",
        tripStopOrder: 2,
        updatedAt: "2024-06-16T10:00:00Z",
        visitedOn: "2024-06-16",
      },
    },
    {
      kind: "visit",
      tripStopOrder: 3,
      visit: {
        id: 12,
        author: "Maija",
        createdAt: "2024-06-18T10:00:00Z",
        excludeFromRoute: false,
        location: null,
        note: null,
        park: {
          name: "Pallas-Yllästunturi",
          slug: "pallas-yllastunturi",
          markerPoint: {
            lat: 67.5,
            lon: 24,
          },
          typeLabel: "Kansallispuisto",
        },
        route: null,
        updatedAt: "2024-06-18T10:00:00Z",
        visitedOn: "2024-06-18",
        imageCount: 2,
      },
    },
  ],
};

const parkVisitsBySlug = new Map<string, ParkVisits["visits"]>([
  [
    "nuuksio",
    [
      {
        author: null,
        createdAt: "2024-06-15T10:00:00Z",
        excludeFromRoute: false,
        id: 11,
        images: [
          {
            id: 501,
            fullUrl: "https://images.example.com/nuuksio.jpg",
            thumbUrl: "https://images.example.com/nuuksio-thumb.jpg",
            fullWidth: 1600,
            fullHeight: 900,
            thumbWidth: 640,
            thumbHeight: 360,
            originalName: "nuuksio.jpg",
            displayOrder: 1,
            createdAt: "2024-06-15T12:00:00Z",
          },
        ],
        location: null,
        note: "Aamupäivän kierros",
        route: "Punarinnankierros",
        trip: {
          id: 7,
          name: "Kesaretki",
          slug: "kesaretki",
        },
        tripStopOrder: 1,
        updatedAt: "2024-06-15T10:00:00Z",
        visitedOn: "2024-06-15",
      },
    ],
  ],
  [
    "pallas-yllastunturi",
    [
      {
        author: "Maija",
        createdAt: "2024-06-18T10:00:00Z",
        excludeFromRoute: false,
        id: 12,
        images: [
          {
            id: 601,
            fullUrl: "https://images.example.com/pallas.jpg",
            thumbUrl: "https://images.example.com/pallas-thumb.jpg",
            fullWidth: 1600,
            fullHeight: 900,
            thumbWidth: 640,
            thumbHeight: 360,
            originalName: "pallas.jpg",
            displayOrder: 1,
            createdAt: "2024-06-18T12:00:00Z",
          },
          {
            id: 602,
            fullUrl: "https://images.example.com/pallas-2.jpg",
            thumbUrl: "https://images.example.com/pallas-2-thumb.jpg",
            fullWidth: 1600,
            fullHeight: 900,
            thumbWidth: 640,
            thumbHeight: 360,
            originalName: "pallas-2.jpg",
            displayOrder: 2,
            createdAt: "2024-06-18T12:05:00Z",
          },
        ],
        location: null,
        note: null,
        route: null,
        trip: {
          id: 7,
          name: "Kesaretki",
          slug: "kesaretki",
        },
        tripStopOrder: 3,
        updatedAt: "2024-06-18T10:00:00Z",
        visitedOn: "2024-06-18",
      },
    ],
  ],
]);

describe("public-trip-visit-details", () => {
  it("marks notes or images as expandable visit content", () => {
    const [firstVisit, , thirdVisit] = trip.itinerary;

    if (firstVisit.kind !== "visit" || thirdVisit.kind !== "visit") {
      throw new Error("Expected trip visit fixtures");
    }

    expect(tripVisitHasExpandableDetails(firstVisit.visit)).toBe(true);
    expect(tripVisitHasExpandableDetails(thirdVisit.visit)).toBe(true);
    expect(
      tripVisitHasExpandableDetails({
        ...firstVisit.visit,
        imageCount: 0,
        note: null,
      }),
    ).toBe(false);
  });

  it("marks stop notes as expandable content", () => {
    const [, stopItem] = trip.itinerary;

    if (stopItem?.kind !== "stop") {
      throw new Error("Expected trip stop fixture");
    }

    expect(tripStopHasExpandableDetails(stopItem.stop)).toBe(true);
    expect(
      tripStopHasExpandableDetails({
        ...stopItem.stop,
        note: "   ",
      }),
    ).toBe(false);
  });

  it("creates stable itinerary item keys for visits and stops", () => {
    expect(createTripItineraryItemKey("visit", 11)).toBe("visit:11");
    expect(createTripItineraryItemKey("stop", 31)).toBe("stop:31");
  });

  it("collects only the park slugs whose trip visits need deferred image details", () => {
    expect(collectTripVisitDetailTargets(trip)).toEqual(
      new Map([
        ["nuuksio", [11]],
        ["pallas-yllastunturi", [12]],
      ]),
    );
  });

  it("builds a response keyed by trip visit id with only the matching images", () => {
    expect(buildPublicTripVisitDetailsResponse(trip, parkVisitsBySlug)).toEqual({
      visits: {
        "11": {
          images: parkVisitsBySlug.get("nuuksio")?.[0]?.images ?? [],
        },
        "12": {
          images: parkVisitsBySlug.get("pallas-yllastunturi")?.[0]?.images ?? [],
        },
      },
    });
  });
});
