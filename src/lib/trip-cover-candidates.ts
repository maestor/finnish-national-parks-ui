import type { VisitWithPark } from "./parks";
import type { TripDetail } from "./trips";

export type TripCoverCandidate = {
  context: string;
  id: number;
  source: "trip-stop-image" | "visit-image";
  thumbUrl: string;
};

export const buildTripCoverCandidates = (
  trip: Pick<TripDetail, "id" | "itinerary">,
  visits: VisitWithPark[],
) => {
  const visitCandidates = visits
    .filter((visit) => visit.trip?.id === trip.id)
    .flatMap((visit) =>
      visit.images.map((image) => ({
        context: visit.park.name,
        id: image.id,
        source: "visit-image" as const,
        thumbUrl: image.thumbUrl,
      })),
    );
  const stopCandidates = (trip.itinerary ?? [])
    .filter((item) => item.kind === "stop")
    .flatMap((item) =>
      item.stop.images.map((image) => ({
        context: item.stop.displayName ?? item.stop.location.displayName,
        id: image.id,
        source: "trip-stop-image" as const,
        thumbUrl: image.thumbUrl,
      })),
    );
  return [...visitCandidates, ...stopCandidates];
};
