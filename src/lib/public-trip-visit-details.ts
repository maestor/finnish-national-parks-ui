import type { ParkVisits, VisitImage } from "./parks";
import type { PublicTripDetail, PublicTripItineraryVisitItem } from "./trips";

export interface PublicTripVisitDetails {
  images: VisitImage[];
}

export interface PublicTripVisitDetailsResponse {
  visits: Record<string, PublicTripVisitDetails>;
}

const hasNonEmptyText = (value: string | null) => Boolean(value?.trim());

export const tripVisitHasExpandableDetails = (visit: PublicTripItineraryVisitItem["visit"]) =>
  hasNonEmptyText(visit.note) || visit.imageCount > 0;

const tripVisitNeedsDeferredDetails = (visit: PublicTripItineraryVisitItem["visit"]) =>
  visit.imageCount > 0;

export const collectTripVisitDetailTargets = (trip: PublicTripDetail) => {
  const targets = new Map<string, number[]>();

  for (const item of trip.itinerary) {
    if (item.kind !== "visit" || tripVisitNeedsDeferredDetails(item.visit) === false) {
      continue;
    }

    const targetVisitIds = targets.get(item.visit.park.slug) ?? [];
    targetVisitIds.push(item.visit.id);
    targets.set(item.visit.park.slug, targetVisitIds);
  }

  return targets;
};

export const buildPublicTripVisitDetailsResponse = (
  trip: PublicTripDetail,
  parkVisitsBySlug: Map<string, ParkVisits["visits"]>,
): PublicTripVisitDetailsResponse => {
  const visits: PublicTripVisitDetailsResponse["visits"] = {};

  for (const item of trip.itinerary) {
    if (item.kind !== "visit" || tripVisitNeedsDeferredDetails(item.visit) === false) {
      continue;
    }

    const matchingVisit = parkVisitsBySlug
      .get(item.visit.park.slug)
      ?.find((parkVisit) => parkVisit.id === item.visit.id);

    visits[String(item.visit.id)] = {
      images: matchingVisit?.images ?? [],
    };
  }

  return { visits };
};
