"use client";

import { FeaturedImagePicker } from "@/components/ui/featured-image-picker";
import type { TripImageCandidate } from "@/lib/trips";

interface TripImagePickerProps {
  initialSelection: TripImageCandidate | null;
  onClose: () => void;
  onSaved: (selection: TripImageCandidate | null) => Promise<void> | void;
  open: boolean;
  tripId: number;
}

export const TripImagePicker = ({ tripId, ...props }: TripImagePickerProps) => (
  <FeaturedImagePicker
    {...props}
    endpoint={`/api/admin/trips/${tripId}`}
    translationNamespace="controlPanel.trips.featuredImage.picker"
  />
);
