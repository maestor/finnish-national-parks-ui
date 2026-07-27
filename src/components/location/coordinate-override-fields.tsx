"use client";

import { useState } from "react";
import { LocationSuggestionInput } from "@/components/location/location-suggestion-input";
import { Label } from "@/components/ui/label";
import { type CoordinateInputValue, formatCoordinateInputValue } from "@/lib/location";
import type { TripPlannerResolvedLocation } from "@/lib/trip-planner";

interface CoordinateOverrideFieldsProps {
  clearButtonLabel: string;
  coordinate: CoordinateInputValue;
  description: string;
  errorMessage?: string;
  inputClassName: string;
  latitudeInputId: string;
  latitudeLabel: string;
  longitudeInputId: string;
  longitudeLabel: string;
  onCoordinateChange: (coordinate: CoordinateInputValue) => void;
  searchInputId: string;
  searchLabel: string;
  searchPlaceholder: string;
}

export const CoordinateOverrideFields = ({
  clearButtonLabel,
  coordinate,
  description,
  errorMessage,
  inputClassName,
  latitudeInputId,
  latitudeLabel,
  longitudeInputId,
  longitudeLabel,
  onCoordinateChange,
  searchInputId,
  searchLabel,
  searchPlaceholder,
}: CoordinateOverrideFieldsProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<TripPlannerResolvedLocation | null>(
    null,
  );

  const hasCoordinateValue = coordinate.lat.trim().length > 0 || coordinate.lon.trim().length > 0;

  const handleSelectedLocationChange = (location: TripPlannerResolvedLocation | null) => {
    setSelectedLocation(location);

    if (location === null) {
      return;
    }

    onCoordinateChange(formatCoordinateInputValue(location.coordinate));
  };

  const handleClearCoordinates = () => {
    setSearchQuery("");
    setSelectedLocation(null);
    onCoordinateChange({ lat: "", lon: "" });
  };

  return (
    <div className="space-y-4 rounded-3xl border border-white/45 bg-white/52 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:border-white/10 dark:bg-slate-950/32 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <LocationSuggestionInput
        assistiveMessage={description}
        id={searchInputId}
        inputClassName="h-10"
        label={searchLabel}
        name={searchInputId}
        onSelectedLocationChange={handleSelectedLocationChange}
        onValueChange={setSearchQuery}
        placeholder={searchPlaceholder}
        required={false}
        selectedLocation={selectedLocation}
        value={searchQuery}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={latitudeInputId}>{latitudeLabel}</Label>
          <input
            id={latitudeInputId}
            type="number"
            inputMode="decimal"
            step="any"
            value={coordinate.lat}
            onChange={(event) =>
              onCoordinateChange({
                ...coordinate,
                lat: event.target.value,
              })
            }
            className={`${inputClassName} h-10`}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={longitudeInputId}>{longitudeLabel}</Label>
          <input
            id={longitudeInputId}
            type="number"
            inputMode="decimal"
            step="any"
            value={coordinate.lon}
            onChange={(event) =>
              onCoordinateChange({
                ...coordinate,
                lon: event.target.value,
              })
            }
            className={`${inputClassName} h-10`}
          />
        </div>
      </div>

      {errorMessage !== undefined && <p className="text-sm text-destructive">{errorMessage}</p>}

      {hasCoordinateValue === true && (
        <button
          type="button"
          onClick={handleClearCoordinates}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          {clearButtonLabel}
        </button>
      )}
    </div>
  );
};
