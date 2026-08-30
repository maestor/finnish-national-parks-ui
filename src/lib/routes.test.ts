import { describe, expect, it } from "vitest";
import {
  appRoutePatterns,
  appRoutes,
  createPathWithSearchParams,
  normalizeAppPath,
} from "./routes";

describe("routes", () => {
  it("defines canonical Finnish app routes", () => {
    expect(appRoutes.home).toBe("/");
    expect(appRoutes.login).toBe("/kirjaudu");
    expect(appRoutes.parks).toBe("/paikat");
    expect(appRoutes.park("pallas")).toBe("/paikka/pallas");
    expect(appRoutes.trip("kesaretki")).toBe("/retki/kesaretki");
    expect(appRoutes.visits).toBe("/kaynnit");
    expect(appRoutes.trips).toBe("/retket");
    expect(appRoutes.tripImage("kesaretki")).toBe("/retki/kesaretki/kuva");
    expect(appRoutes.tripPlanner).toBe("/reissusuunnittelu");
    expect(appRoutes.controlPanel.root).toBe("/hallinta");
    expect(appRoutes.controlPanel.parks).toBe("/hallinta/paikat");
    expect(appRoutes.controlPanel.parkEdit("pallas")).toBe("/hallinta/paikat/pallas/muokkaa");
    expect(appRoutes.controlPanel.trips).toBe("/hallinta/retket");
    expect(appRoutes.controlPanel.newTrip).toBe("/hallinta/retket/uusi");
    expect(appRoutes.controlPanel.editTrip("7")).toBe("/hallinta/retket/7/muokkaa");
    expect(appRoutes.controlPanel.visits).toBe("/hallinta/kaynnit");
    expect(appRoutes.controlPanel.newVisit).toBe("/hallinta/kaynnit/uusi");
    expect(appRoutes.controlPanel.editVisit("42")).toBe("/hallinta/kaynnit/42/muokkaa");
    expect(appRoutes.controlPanel.dateRangeReview).toBe("/hallinta/ajanjaksokatsaus");
    expect(appRoutes.controlPanel.yearReview).toBe("/hallinta/vuosikatsaus");
    expect(appRoutes.dateRangeReviewShare("93d27350-b7a4-48ba-a93f-16f38d44aa03")).toBe(
      "/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
    );
    expect(appRoutes.dateRangeReviewShareImage("93d27350-b7a4-48ba-a93f-16f38d44aa03")).toBe(
      "/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03/kuva",
    );
    expect(appRoutes.yearReviewShare("93d27350-b7a4-48ba-a93f-16f38d44aa03")).toBe(
      "/vuosikatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
    );
    expect(appRoutes.yearReviewShareImage("93d27350-b7a4-48ba-a93f-16f38d44aa03")).toBe(
      "/vuosikatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03/kuva",
    );
  });

  it("normalizes legacy English routes to the canonical Finnish paths", () => {
    expect(normalizeAppPath("/login")).toBe("/kirjaudu");
    expect(normalizeAppPath("/parks?park=pallas")).toBe("/paikat?park=pallas");
    expect(normalizeAppPath("/park/pallas?visit=2#visit-history")).toBe(
      "/paikka/pallas?visit=2#visit-history",
    );
    expect(normalizeAppPath("/trip/kesaretki")).toBe("/retki/kesaretki");
    expect(normalizeAppPath("/visits?year=2026")).toBe("/kaynnit?year=2026");
    expect(normalizeAppPath("/trips")).toBe("/retket");
    expect(normalizeAppPath("/trip-planner")).toBe("/reissusuunnittelu");
    expect(normalizeAppPath("/control-panel")).toBe("/hallinta");
    expect(normalizeAppPath("/control-panel/parks")).toBe("/hallinta/paikat");
    expect(normalizeAppPath("/control-panel/parks/pallas/edit")).toBe(
      "/hallinta/paikat/pallas/muokkaa",
    );
    expect(normalizeAppPath("/control-panel/trips")).toBe("/hallinta/retket");
    expect(normalizeAppPath("/control-panel/trips/new")).toBe("/hallinta/retket/uusi");
    expect(normalizeAppPath("/control-panel/trips/7/edit")).toBe("/hallinta/retket/7/muokkaa");
    expect(normalizeAppPath("/control-panel/visits")).toBe("/hallinta/kaynnit");
    expect(normalizeAppPath("/control-panel/visits/new?park=pallas")).toBe(
      "/hallinta/kaynnit/uusi?park=pallas",
    );
    expect(normalizeAppPath("/control-panel/visits/42/edit")).toBe("/hallinta/kaynnit/42/muokkaa");
    expect(normalizeAppPath("/control-panel/date-range-review")).toBe("/hallinta/ajanjaksokatsaus");
    expect(normalizeAppPath("/date-range-review/share/93d27350-b7a4-48ba-a93f-16f38d44aa03")).toBe(
      "/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
    );
    expect(normalizeAppPath("/control-panel/year-review")).toBe("/hallinta/vuosikatsaus");
    expect(normalizeAppPath("/year-review/share/93d27350-b7a4-48ba-a93f-16f38d44aa03")).toBe(
      "/vuosikatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
    );
  });

  it("detects canonical and legacy control-panel paths", () => {
    expect(appRoutePatterns.isControlPanelPath("/hallinta")).toBe(true);
    expect(appRoutePatterns.isControlPanelPath("/hallinta/kaynnit")).toBe(true);
    expect(appRoutePatterns.isControlPanelPath("/hallinta/retket")).toBe(true);
    expect(appRoutePatterns.isControlPanelPath("/control-panel")).toBe(true);
    expect(appRoutePatterns.isControlPanelPath("/control-panel/parks")).toBe(true);
    expect(appRoutePatterns.isControlPanelPath("/control-panel/trips")).toBe(true);
    expect(appRoutePatterns.isControlPanelPath("/paikat")).toBe(false);
  });

  it("detects the archive and public trip story paths", () => {
    expect(appRoutePatterns.isTripsPath("/retket")).toBe(true);
    expect(appRoutePatterns.isTripsPath("/trips")).toBe(true);
    expect(appRoutePatterns.isTripsPath("/retki/kesaretki")).toBe(true);
    expect(appRoutePatterns.isTripsPath("/paikat")).toBe(false);
  });

  it("detects year-review share routes after normalization", () => {
    expect(appRoutePatterns.isYearReviewSharePath("/vuosikatsaus/jako/share-123")).toBe(true);
    expect(appRoutePatterns.isYearReviewSharePath("/year-review/share/share-123")).toBe(true);
    expect(appRoutePatterns.isYearReviewSharePath("/paikat")).toBe(false);
  });

  it("detects date-range-review share routes after normalization", () => {
    expect(appRoutePatterns.isDateRangeReviewSharePath("/ajanjaksokatsaus/jako/share-123")).toBe(
      true,
    );
    expect(appRoutePatterns.isDateRangeReviewSharePath("/date-range-review/share/share-123")).toBe(
      true,
    );
    expect(appRoutePatterns.isDateRangeReviewSharePath("/paikat")).toBe(false);
  });

  it("builds a path with only defined search params", () => {
    expect(
      createPathWithSearchParams(appRoutes.visits, {
        featured: false,
        month: null,
        year: 2026,
      }),
    ).toBe("/kaynnit?featured=false&year=2026");
  });

  it("returns the plain path when every search param is empty", () => {
    expect(
      createPathWithSearchParams(appRoutes.visits, {
        month: undefined,
        year: null,
      }),
    ).toBe("/kaynnit");
  });
});
