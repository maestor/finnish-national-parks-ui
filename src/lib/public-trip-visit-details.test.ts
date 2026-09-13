import { describe, expect, it } from "vitest";
import { createTripItineraryItemKey } from "./public-trip-visit-details";

describe("public-trip-visit-details", () => {
  it("creates stable itinerary item keys", () => {
    expect(createTripItineraryItemKey("visit", 11)).toBe("visit:11");
    expect(createTripItineraryItemKey("stop", 31)).toBe("stop:31");
  });
});
