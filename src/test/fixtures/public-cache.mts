import type { HomeSummary, MapSummary } from "../../lib/frontend-summaries";
import type { ParkDetail, ParkVisits } from "../../lib/parks";
import type { PublicTripArchiveResponse } from "../../lib/public-trips";
import type { PublicTripDetail } from "../../lib/trips";

export const park = {
  slug: "fixture-park",
  catalogStatus: "active",
  lipasId: 1,
  municipalityCode: null,
  sourceEventDate: null,
  updatedAt: "2026-10-01T00:00:00Z",
  name: "Testipuisto",
  featuredImage: null,
  description: "Testipuiston kuvaus",
  hasMagnet: true,
  address: "Suomi",
  areaKm2: 1,
  displayTypeName: "Kansallispuisto",
  locationLabel: "Suomi",
  logo: null,
  parkUrl: null,
  map: null,
  establishmentYear: 2000,
  boundingBox: { minLat: 60, minLon: 24, maxLat: 61, maxLon: 25 },
  markerPoint: { lat: 60.5, lon: 24.5 },
  category: { name: "Kansallispuistot", slug: "national-park" },
  postalCode: null,
  postalOffice: null,
  type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
  boundaryGeoJson: undefined,
} satisfies ParkDetail;
const visit = {
  id: 10,
  visitedOn: "2024-06-15",
  route: "Polku",
  excludeFromRoute: false,
  author: "Testaaja",
  location: null,
  note: "Vanhempi vierailu",
  trip: null,
  tripStopOrder: null,
  createdAt: "2024-06-15T10:00:00Z",
  updatedAt: "2024-06-15T10:00:00Z",
  images: [],
};
export const visits = {
  visitedSummary: { visited: true, visitCount: 2, lastVisitedOn: "2025-06-15" },
  visits: [{ ...visit, id: 20, visitedOn: "2025-06-15", note: "Uudempi vierailu" }, visit],
} satisfies ParkVisits;
export const trip = {
  id: 1,
  name: "Testiretki",
  slug: "fixture-trip",
  description: "Testiretken kuvaus",
  startingPoint: null,
  dateRange: null,
  visitCount: 0,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  featuredImage: null,
  imageCount: 0,
  stopCount: 0,
  route: { available: false, success: true, error: null, data: null },
  itinerary: [],
} satisfies PublicTripDetail;

export const mapSummary = (revision: number): MapSummary => ({
  parks: [{ ...park, name: `Testipuisto ${revision}`, visitedSummary: visits.visitedSummary }],
  version: revision,
  updatedAt: null,
});
export const homeSummary = (revision: number): HomeSummary => ({
  totalVisits: revision,
  uniqueVisitedParks: 1,
  progressByType: [],
  progressByCategory: [],
  latestTrip: null,
  latestStandaloneVisit: null,
  featuredVisit: null,
  featuredPark: null,
  magnetProgress: { visitedParks: 0, totalParks: 0 },
  seasonalVisitCounts: { spring: 0, summer: revision, autumn: 0, winter: 0 },
  version: revision,
  updatedAt: null,
});
export const archive = (revision: number): PublicTripArchiveResponse => ({
  trips: [
    {
      id: 1,
      name: `Testiretki ${revision}`,
      slug: trip.slug,
      createdAt: trip.createdAt,
      dateRange: null,
      descriptionExcerpt: null,
      featuredImage: null,
      stopCount: 0,
      visitCount: 0,
    },
  ],
  nextCursor: null,
  total: 1,
});
