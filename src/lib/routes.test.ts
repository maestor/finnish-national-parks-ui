import { describe, expect, it } from "vitest";
import { appRoutePatterns, appRoutes, normalizeAppPath } from "./routes";

describe("routes", () => {
  it("defines canonical Finnish app routes", () => {
    expect(appRoutes.home).toBe("/");
    expect(appRoutes.login).toBe("/kirjaudu");
    expect(appRoutes.parks).toBe("/paikat");
    expect(appRoutes.park("pallas")).toBe("/paikka/pallas");
    expect(appRoutes.visits).toBe("/kaynnit");
    expect(appRoutes.tripPlanner).toBe("/reissusuunnittelu");
    expect(appRoutes.controlPanel.root).toBe("/hallinta");
    expect(appRoutes.controlPanel.parks).toBe("/hallinta/paikat");
    expect(appRoutes.controlPanel.parkEdit("pallas")).toBe("/hallinta/paikat/pallas/muokkaa");
    expect(appRoutes.controlPanel.visits).toBe("/hallinta/kaynnit");
    expect(appRoutes.controlPanel.newVisit).toBe("/hallinta/kaynnit/uusi");
    expect(appRoutes.controlPanel.editVisit("42")).toBe("/hallinta/kaynnit/42/muokkaa");
  });

  it("normalizes legacy English routes to the canonical Finnish paths", () => {
    expect(normalizeAppPath("/login")).toBe("/kirjaudu");
    expect(normalizeAppPath("/parks?park=pallas")).toBe("/paikat?park=pallas");
    expect(normalizeAppPath("/park/pallas?visit=2#visit-history")).toBe(
      "/paikka/pallas?visit=2#visit-history",
    );
    expect(normalizeAppPath("/visits?year=2026")).toBe("/kaynnit?year=2026");
    expect(normalizeAppPath("/trip-planner")).toBe("/reissusuunnittelu");
    expect(normalizeAppPath("/control-panel")).toBe("/hallinta");
    expect(normalizeAppPath("/control-panel/parks")).toBe("/hallinta/paikat");
    expect(normalizeAppPath("/control-panel/parks/pallas/edit")).toBe(
      "/hallinta/paikat/pallas/muokkaa",
    );
    expect(normalizeAppPath("/control-panel/visits")).toBe("/hallinta/kaynnit");
    expect(normalizeAppPath("/control-panel/visits/new?park=pallas")).toBe(
      "/hallinta/kaynnit/uusi?park=pallas",
    );
    expect(normalizeAppPath("/control-panel/visits/42/edit")).toBe("/hallinta/kaynnit/42/muokkaa");
  });

  it("detects canonical and legacy control-panel paths", () => {
    expect(appRoutePatterns.isControlPanelPath("/hallinta")).toBe(true);
    expect(appRoutePatterns.isControlPanelPath("/hallinta/kaynnit")).toBe(true);
    expect(appRoutePatterns.isControlPanelPath("/control-panel")).toBe(true);
    expect(appRoutePatterns.isControlPanelPath("/control-panel/parks")).toBe(true);
    expect(appRoutePatterns.isControlPanelPath("/paikat")).toBe(false);
  });
});
