import type { PublicTripItineraryStopItem, PublicTripItineraryVisitItem } from "./trips";

const hasNonEmptyText = (value: string | null) => Boolean(value?.trim());

export const createTripItineraryItemKey = (kind: "stop" | "visit", id: number) => `${kind}:${id}`;

export const tripVisitHasExpandableDetails = (visit: PublicTripItineraryVisitItem["visit"]) =>
  hasNonEmptyText(visit.note) || visit.imageCount > 0;

export const tripStopHasExpandableDetails = (stop: PublicTripItineraryStopItem["stop"]) =>
  hasNonEmptyText(stop.note) || stop.imageCount > 0;
