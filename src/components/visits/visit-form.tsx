"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CoordinateOverrideFields } from "@/components/location/coordinate-override-fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import {
  type CoordinateInputValue,
  formatCoordinateInputValue,
  parseOptionalCoordinateInput,
} from "@/lib/location";
import type {
  Park,
  Visit,
  VisitCreateRequest,
  VisitUpdateRequest,
  VisitWithPark,
} from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";
import { appRoutes, createPathWithSearchParams } from "@/lib/routes";

interface VisitFormProps {
  parks: Park[];
  visitToEdit?: VisitWithPark;
  defaultParkSlug?: string;
}

export const VisitForm = ({ parks, visitToEdit, defaultParkSlug }: VisitFormProps) => {
  const t = useTranslations("controlPanel.visits.form");
  const router = useRouter();
  const isEditing = !!visitToEdit;

  const [parkSlug, setParkSlug] = useState(visitToEdit?.park.slug ?? defaultParkSlug ?? "");
  const [visitedOn, setVisitedOn] = useState(visitToEdit?.visitedOn ?? "");
  const [route, setRoute] = useState(visitToEdit?.route ?? "");
  const [author, setAuthor] = useState(visitToEdit?.author ?? "");
  const [location, setLocation] = useState<CoordinateInputValue>(
    formatCoordinateInputValue(visitToEdit?.location ?? null),
  );
  const [note, setNote] = useState(visitToEdit?.note ?? "");
  const [isPreview, setIsPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState({
    visitedOn: visitToEdit?.visitedOn ?? "",
    route: visitToEdit?.route ?? "",
    author: visitToEdit?.author ?? "",
    location: formatCoordinateInputValue(visitToEdit?.location ?? null),
    note: visitToEdit?.note ?? "",
  });
  const isEditDirty =
    !visitToEdit ||
    visitedOn !== savedSnapshot.visitedOn ||
    route !== savedSnapshot.route ||
    author !== savedSnapshot.author ||
    location.lat !== savedSnapshot.location.lat ||
    location.lon !== savedSnapshot.location.lon ||
    note !== savedSnapshot.note;
  const isSubmitDisabled = isSubmitting || (isEditing && !isEditDirty);
  const hasParkSlugError = errors.parkSlug !== undefined;
  const hasVisitedOnError = errors.visitedOn !== undefined;
  const hasLocationError = errors.location !== undefined;
  const hasSubmitError = submitError !== null;
  const hasStatusMessage = statusMessage !== null;

  const handleBack = () => {
    router.back();
  };

  const revalidateVisitPublicViews = async ({
    parkSlug,
    previousTripSlug = null,
    nextTripSlug = null,
  }: {
    nextTripSlug?: string | null;
    parkSlug: string;
    previousTripSlug?: string | null;
  }) => {
    const tripSlugs = [...new Set([previousTripSlug, nextTripSlug].filter(Boolean))];

    if (tripSlugs.length === 0) {
      await revalidatePublicCache({ parkSlug });
      return;
    }

    await Promise.all(
      tripSlugs.map((tripSlug, index) =>
        revalidatePublicCache({
          parkSlug: index === 0 ? parkSlug : null,
          tripSlug,
        }),
      ),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setSubmitError(null);
    setStatusMessage(null);

    const validationErrors: Record<string, string> = {};
    if (!isEditing && !parkSlug) {
      validationErrors.parkSlug = t("validation.parkRequired");
    }
    if (!visitedOn) {
      validationErrors.visitedOn = t("validation.dateRequired");
    }

    const parsedLocation = parseOptionalCoordinateInput(location);
    if (parsedLocation.kind === "invalid") {
      validationErrors.location = t("validation.locationInvalid");
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (isEditing && !isEditDirty) {
      return;
    }

    let shouldResetSubmittingState = true;
    setIsSubmitting(true);
    try {
      if (isEditing && visitToEdit) {
        const payload: VisitUpdateRequest = {
          visitedOn,
          route: route || null,
          author: author || null,
          location: parsedLocation.kind === "value" ? parsedLocation.value : null,
          note: note || null,
        };
        await apiFetch(`/api/visits/${visitToEdit.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        await revalidateVisitPublicViews({
          parkSlug: visitToEdit.park.slug,
          previousTripSlug: visitToEdit.trip?.slug ?? null,
          nextTripSlug: visitToEdit.trip?.slug ?? null,
        });
        setSavedSnapshot({
          visitedOn,
          route: route || "",
          author: author || "",
          location: formatCoordinateInputValue(
            parsedLocation.kind === "value" ? parsedLocation.value : null,
          ),
          note: note || "",
        });
        setStatusMessage(t("updateSuccess"));
        router.refresh();
      } else {
        const payload: VisitCreateRequest = {
          visitedOn,
          route: route || null,
          author: author || null,
          location: parsedLocation.kind === "value" ? parsedLocation.value : null,
          note: note || null,
        };
        const createdVisit = await apiFetch<Visit>(`/api/parks/${parkSlug}/visits`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await revalidateVisitPublicViews({
          parkSlug,
        });
        shouldResetSubmittingState = false;
        router.push(
          createPathWithSearchParams(appRoutes.controlPanel.editVisit(createdVisit.id), {
            created: 1,
          }),
        );
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      if (shouldResetSubmittingState) {
        setIsSubmitting(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!visitToEdit) return;
    if (!window.confirm(t("deleteConfirm"))) {
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch(`/api/visits/${visitToEdit.id}`, { method: "DELETE" });
      await revalidateVisitPublicViews({
        parkSlug: visitToEdit.park.slug,
        previousTripSlug: visitToEdit.trip?.slug ?? null,
      });
      router.push(appRoutes.controlPanel.visits);
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    "flex w-full rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm ring-offset-background shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="park" required>
          {t("parkLabel")}
        </Label>
        {isEditing ? (
          <div className={inputClassName}>{visitToEdit?.park.name}</div>
        ) : (
          <Select
            id="park"
            value={parkSlug}
            onChange={(e) => setParkSlug(e.target.value)}
            className="h-10"
          >
            <option value="">{t("parkPlaceholder")}</option>
            {parks.map((park) => (
              <option key={park.slug} value={park.slug}>
                {park.name}
              </option>
            ))}
          </Select>
        )}
        {hasParkSlugError && <p className="text-sm text-destructive">{errors.parkSlug}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="visitedOn" required>
          {t("dateLabel")}
        </Label>
        <input
          id="visitedOn"
          type="date"
          lang="fi"
          value={visitedOn}
          onChange={(e) => setVisitedOn(e.target.value)}
          className={`${inputClassName} h-10 max-w-56`}
        />
        {hasVisitedOnError && <p className="text-sm text-destructive">{errors.visitedOn}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="route">{t("routeLabel")}</Label>
        <input
          id="route"
          type="text"
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          placeholder={t("routePlaceholder")}
          className={`${inputClassName} h-10`}
        />
      </div>

      <div className="space-y-2">
        <CoordinateOverrideFields
          clearButtonLabel={t("clearLocation")}
          coordinate={location}
          description={t("locationDescription")}
          errorMessage={hasLocationError ? errors.location : undefined}
          inputClassName={inputClassName}
          latitudeInputId="visit-location-lat"
          latitudeLabel={t("locationLatitudeLabel")}
          longitudeInputId="visit-location-lon"
          longitudeLabel={t("locationLongitudeLabel")}
          onCoordinateChange={setLocation}
          searchInputId="visit-location-search"
          searchLabel={t("locationSearchLabel")}
          searchPlaceholder={t("locationSearchPlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="author">{t("authorLabel")}</Label>
        <input
          id="author"
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder={t("authorPlaceholder")}
          className={`${inputClassName} h-10`}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="note">{t("noteLabel")}</Label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPreview(!isPreview)}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              {isPreview ? t("edit") : t("preview")}
            </button>
            <a
              href="https://www.markdownguide.org/basic-syntax/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              {t("markdownGuide")}
            </a>
          </div>
        </div>
        {isPreview ? (
          <div className="prose prose-sm dark:prose-invert max-w-none min-h-30 rounded-xl border border-white/45 bg-white/78 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{note || "_"}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            rows={5}
            className={`${inputClassName} resize-y`}
          />
        )}
      </div>

      {hasSubmitError && <p className="text-sm text-destructive">{submitError}</p>}
      {hasStatusMessage && (
        <output
          aria-live="polite"
          className="block rounded-[1.3rem] border border-emerald-600/20 bg-[linear-gradient(118deg,rgba(22,101,52,0.14),rgba(15,118,110,0.08))] px-4 py-3 text-sm text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] dark:border-emerald-300/18 dark:text-emerald-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        >
          <span>{statusMessage}</span>{" "}
          <Link
            href={appRoutes.controlPanel.visits}
            className="font-medium underline underline-offset-4 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:text-emerald-100"
          >
            {t("viewAllVisits")}
          </Link>
        </output>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSubmitDisabled}>
          {isSubmitting ? "..." : t("submit")}
        </Button>
        {isEditing && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            {t("delete")}
          </Button>
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
