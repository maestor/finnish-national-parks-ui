"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { LocationSuggestionInput } from "@/components/location/location-suggestion-input";
import { useSnackbar } from "@/components/providers/snackbar-provider";
import { Button } from "@/components/ui/button";
import {
  LONG_TEXTAREA_MAX_LENGTH,
  TextareaWithCounter,
} from "@/components/ui/textarea-with-counter";
import { apiFetch } from "@/lib/api";
import {
  formatCoordinateQuery,
  getUserLocationStatusFromError,
  LOCATION_REQUEST_OPTIONS,
  resolveLocationFromCoordinate,
  type UserLocationStatus,
} from "@/lib/location";
import { revalidatePublicCache } from "@/lib/public-cache";
import { appRoutes, createPathWithSearchParams } from "@/lib/routes";
import type {
  Trip,
  TripCreateRequest,
  TripDetail,
  TripLocation,
  TripUpdateRequest,
} from "@/lib/trips";

interface TripFormProps {
  tripToEdit?: Trip;
}

type TripFormLocationMessageKey =
  | "locationLocating"
  | "locationUnsupported"
  | "locationPermissionDenied"
  | "locationRateLimited"
  | "locationTimeout"
  | "locationUnavailable";

const INPUT_CLASS_NAME =
  "flex w-full rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm ring-offset-background shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

const getLocationStatusMessage = (
  status: UserLocationStatus,
  t: (key: TripFormLocationMessageKey) => string,
) => {
  switch (status) {
    case "idle":
      return null;
    case "locating":
      return t("locationLocating");
    case "unsupported":
      return t("locationUnsupported");
    case "permissionDenied":
      return t("locationPermissionDenied");
    case "rateLimited":
      return t("locationRateLimited");
    case "timeout":
      return t("locationTimeout");
    case "unavailable":
      return t("locationUnavailable");
  }
};

const getLocationKey = (location: TripLocation | null) =>
  location ? `${location.label}|${formatCoordinateQuery(location.coordinate)}` : "";

const trimToNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const revalidateTripPages = async (...tripSlugs: Array<string | null | undefined>) => {
  const uniqueTripSlugs = [...new Set(tripSlugs.filter((slug): slug is string => Boolean(slug)))];

  if (uniqueTripSlugs.length === 0) {
    await revalidatePublicCache();
    return;
  }

  await Promise.all(uniqueTripSlugs.map((tripSlug) => revalidatePublicCache({ tripSlug })));
};

export const TripForm = ({ tripToEdit }: TripFormProps) => {
  const t = useTranslations("controlPanel.trips.form");
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const isEditing = !!tripToEdit;

  const [name, setName] = useState(tripToEdit?.name ?? "");
  const [description, setDescription] = useState(tripToEdit?.description ?? "");
  const [startingPointQuery, setStartingPointQuery] = useState(
    tripToEdit?.startingPoint?.label ?? "",
  );
  const [startingPoint, setStartingPoint] = useState<TripLocation | null>(
    tripToEdit?.startingPoint ?? null,
  );
  const [startingPointLocationStatus, setStartingPointLocationStatus] =
    useState<UserLocationStatus>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState({
    name: tripToEdit?.name ?? "",
    description: tripToEdit?.description ?? "",
    startingPointKey: getLocationKey(tripToEdit?.startingPoint ?? null),
  });

  const trimmedName = name.trim();
  const normalizedStartingPointQuery = startingPointQuery.trim();
  const startingPointLocationStatusMessage = getLocationStatusMessage(
    startingPointLocationStatus,
    t,
  );
  const isEditDirty =
    !tripToEdit ||
    trimmedName !== savedSnapshot.name ||
    description !== savedSnapshot.description ||
    getLocationKey(startingPoint) !== savedSnapshot.startingPointKey;
  const isDescriptionTooLong = description.length > LONG_TEXTAREA_MAX_LENGTH;
  const isSubmitDisabled = isSubmitting || isDescriptionTooLong || (isEditing && !isEditDirty);

  const handleBack = () => {
    router.back();
  };

  const handleStartingPointValueChange = (value: string) => {
    if (startingPointLocationStatus !== "locating") {
      setStartingPointLocationStatus("idle");
    }

    setStartingPointQuery(value);
  };

  const handleClearStartingPoint = () => {
    setStartingPointLocationStatus("idle");
    setStartingPointQuery("");
    setStartingPoint(null);
    setErrors((currentErrors) => {
      if (!currentErrors.startingPoint) {
        return currentErrors;
      }

      const { startingPoint: _startingPoint, ...rest } = currentErrors;
      return rest;
    });
  };

  const handleLocateStartingPoint = () => {
    const geolocation = window.navigator.geolocation;

    if (!geolocation) {
      setStartingPointLocationStatus("unsupported");
      return;
    }

    setStartingPointLocationStatus("locating");

    geolocation.getCurrentPosition(
      async (position) => {
        const resolved = await resolveLocationFromCoordinate({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });

        setStartingPointQuery(resolved.location.label);
        setStartingPoint(resolved.location);
        setStartingPointLocationStatus(resolved.rateLimited ? "rateLimited" : "idle");
      },
      (error) => {
        setStartingPointLocationStatus(getUserLocationStatusFromError(error));
      },
      LOCATION_REQUEST_OPTIONS,
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});

    const nextErrors: Record<string, string> = {};

    if (!trimmedName) {
      nextErrors.name = t("validation.nameRequired");
    }

    if (normalizedStartingPointQuery.length > 0 && startingPoint === null) {
      nextErrors.startingPoint = t("validation.startingPointSelectionRequired");
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (isEditing && !isEditDirty) {
      return;
    }

    let shouldResetSubmittingState = true;
    setIsSubmitting(true);

    try {
      if (tripToEdit) {
        const payload: TripUpdateRequest = {};

        if (trimmedName !== savedSnapshot.name) {
          payload.name = trimmedName;
        }

        if (description !== savedSnapshot.description) {
          payload.description = trimToNull(description);
        }

        if (getLocationKey(startingPoint) !== savedSnapshot.startingPointKey) {
          payload.startingPoint = startingPoint;
        }

        const updatedTrip = await apiFetch<TripDetail>(`/api/trips/${tripToEdit.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });

        await revalidateTripPages(tripToEdit.slug, updatedTrip.slug);
        setName(updatedTrip.name);
        setDescription(updatedTrip.description ?? "");
        setStartingPoint(updatedTrip.startingPoint);
        setStartingPointQuery(updatedTrip.startingPoint?.label ?? "");
        setSavedSnapshot({
          name: updatedTrip.name,
          description: updatedTrip.description ?? "",
          startingPointKey: getLocationKey(updatedTrip.startingPoint),
        });
        showSnackbar({
          action: { href: appRoutes.controlPanel.trips, label: t("viewAllTrips") },
          message: t("updateSuccess"),
          tone: "success",
        });
        router.refresh();
      } else {
        const payload = {
          description: trimToNull(description),
          name: trimmedName,
          startingPoint,
        } satisfies TripCreateRequest;

        const createdTrip = await apiFetch<Trip>("/api/trips", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        await revalidateTripPages(createdTrip.slug);
        shouldResetSubmittingState = false;
        router.push(
          createPathWithSearchParams(appRoutes.controlPanel.editTrip(createdTrip.id), {
            created: 1,
          }),
        );
      }
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : String(error),
        tone: "error",
      });
    } finally {
      if (shouldResetSubmittingState) {
        setIsSubmitting(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!tripToEdit) {
      return;
    }

    if (!window.confirm(t("deleteConfirm", { tripName: tripToEdit.name }))) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch(`/api/trips/${tripToEdit.id}`, { method: "DELETE" });
      await revalidateTripPages(tripToEdit.slug);
      router.push(appRoutes.controlPanel.trips);
      router.refresh();
    } catch (error) {
      showSnackbar({
        message: error instanceof Error ? error.message : String(error),
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-4xl space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="trip-name" className="text-sm font-medium">
            {t("nameLabel")}
            <span className="text-primary" aria-hidden="true">
              {" *"}
            </span>
          </label>
          <input
            id="trip-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("namePlaceholder")}
            className={`${INPUT_CLASS_NAME} h-10`}
          />
          {!!errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <LocationSuggestionInput
            assistiveMessage={startingPointLocationStatusMessage ?? undefined}
            assistiveMessageTone={
              startingPointLocationStatus !== "idle" && startingPointLocationStatus !== "locating"
                ? "error"
                : "default"
            }
            id="trip-starting-point"
            inputClassName="h-10"
            isLocating={startingPointLocationStatus === "locating"}
            label={t("startingPointLabel")}
            locateButtonLabel={t("useCurrentLocation")}
            name="startingPoint"
            onLocate={handleLocateStartingPoint}
            onSelectedLocationChange={setStartingPoint}
            onValueChange={handleStartingPointValueChange}
            placeholder={t("startingPointPlaceholder")}
            required={false}
            selectedLocation={startingPoint}
            value={startingPointQuery}
          />
          {!!errors.startingPoint && (
            <p className="text-sm text-destructive">{errors.startingPoint}</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {(startingPoint !== null || normalizedStartingPointQuery.length > 0) && (
              <button
                type="button"
                onClick={handleClearStartingPoint}
                className="text-sm text-muted-foreground underline hover:text-foreground"
              >
                {t("clearStartingPoint")}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="trip-description" className="text-sm font-medium">
          {t("descriptionLabel")}
        </label>
        <TextareaWithCounter
          id="trip-description"
          value={description}
          onValueChange={setDescription}
          placeholder={t("descriptionPlaceholder")}
          rows={5}
          className={`${INPUT_CLASS_NAME} resize-y`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isSubmitDisabled}>
          {isSubmitting ? "..." : t("submit")}
        </Button>
        {tripToEdit !== undefined && (
          <>
            <Link
              href={appRoutes.controlPanel.newVisit}
              className="inline-flex h-10 items-center justify-center rounded-md border border-white/45 bg-white/78 px-4 py-2 text-sm font-medium text-foreground shadow-[0_10px_24px_rgba(148,163,184,0.18)] backdrop-blur-md transition-colors hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[0_16px_32px_rgba(2,6,23,0.28)] dark:hover:bg-slate-950/74"
            >
              {t("addVisitToTrip")}
            </Link>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {t("delete")}
            </Button>
          </>
        )}
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          {t("back")}
        </button>
      </div>
    </form>
  );
};
