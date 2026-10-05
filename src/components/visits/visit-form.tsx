"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { PublicCacheRefreshNotice } from "@/components/admin/public-cache-refresh-notice";
import { CoordinateOverrideFields } from "@/components/location/coordinate-override-fields";
import { useSnackbar } from "@/components/providers/snackbar-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Select } from "@/components/ui/select";
import { LONG_TEXTAREA_MAX_LENGTH } from "@/components/ui/textarea-with-counter";
import { apiFetch } from "@/lib/api";
import { getCurrentFinnishDate } from "@/lib/fi-date";
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
  const { showSnackbar } = useSnackbar();
  const router = useRouter();
  const isEditing = !!visitToEdit;

  const [parkSlug, setParkSlug] = useState(visitToEdit?.park.slug ?? defaultParkSlug ?? "");
  const [visitedOn, setVisitedOn] = useState(
    () => visitToEdit?.visitedOn ?? getCurrentFinnishDate(),
  );
  const [route, setRoute] = useState(visitToEdit?.route ?? "");
  const [author, setAuthor] = useState(visitToEdit?.author ?? "");
  const [location, setLocation] = useState<CoordinateInputValue>(
    formatCoordinateInputValue(visitToEdit?.location ?? null),
  );
  const [note, setNote] = useState(visitToEdit?.note ?? "");
  const [status, setStatus] = useState(visitToEdit?.status ?? "draft");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cacheRefreshFailed, setCacheRefreshFailed] = useState(false);
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
  const isNoteTooLong = note.length > LONG_TEXTAREA_MAX_LENGTH;
  const hasParkSlugError = errors.parkSlug !== undefined;
  const hasVisitedOnError = errors.visitedOn !== undefined;
  const hasLocationError = errors.location !== undefined;

  const handleBack = () => {
    router.back();
  };

  const revalidateVisitPublicViews = async ({
    expireImmediately = false,
    parkSlug,
    previousTripSlug = null,
    nextTripSlug = null,
  }: {
    nextTripSlug?: string | null;
    parkSlug: string;
    previousTripSlug?: string | null;
    expireImmediately?: boolean;
  }) => {
    const tripSlugs = [...new Set([previousTripSlug, nextTripSlug].filter(Boolean))];

    if (tripSlugs.length === 0) {
      return revalidatePublicCache({ expireImmediately, parkSlug });
    }

    const results = await Promise.all(
      tripSlugs.map((tripSlug, index) =>
        revalidatePublicCache({
          parkSlug: index === 0 ? parkSlug : null,
          tripSlug,
          expireImmediately,
        }),
      ),
    );
    return results.every(Boolean);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const requestedStatus =
      submitter instanceof HTMLButtonElement && submitter.name === "status"
        ? (submitter.value as "draft" | "published")
        : undefined;
    const previewAfterSave =
      submitter instanceof HTMLButtonElement &&
      submitter.name === "intent" &&
      submitter.value === "preview";
    if (
      requestedStatus === "draft" &&
      status === "published" &&
      !window.confirm(t("withdrawConfirm"))
    ) {
      return;
    }
    setErrors({});

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

    if (isEditing && !isEditDirty && requestedStatus === undefined) {
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
          ...(requestedStatus ? { status: requestedStatus } : {}),
        };
        await apiFetch(`/api/visits/${visitToEdit.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        const cacheRefreshed = await revalidateVisitPublicViews({
          expireImmediately: requestedStatus !== undefined,
          parkSlug: visitToEdit.park.slug,
          previousTripSlug: visitToEdit.trip?.slug ?? null,
          nextTripSlug: visitToEdit.trip?.slug ?? null,
        });
        setCacheRefreshFailed(!cacheRefreshed);
        if (requestedStatus) setStatus(requestedStatus);
        setSavedSnapshot({
          visitedOn,
          route: route || "",
          author: author || "",
          location: formatCoordinateInputValue(
            parsedLocation.kind === "value" ? parsedLocation.value : null,
          ),
          note: note || "",
        });
        showSnackbar({
          action: { href: appRoutes.controlPanel.visits, label: t("viewAllVisits") },
          message: cacheRefreshed ? t("updateSuccess") : t("savedCacheRefreshFailed"),
          tone: "success",
        });
        if (previewAfterSave) {
          router.push(appRoutes.controlPanel.previewVisit(visitToEdit.id));
        } else {
          router.refresh();
        }
      } else {
        const payload: VisitCreateRequest = {
          visitedOn,
          route: route || null,
          author: author || null,
          location: parsedLocation.kind === "value" ? parsedLocation.value : null,
          note: note || null,
          status: requestedStatus ?? "published",
        };
        const createdVisit = await apiFetch<Visit>(`/api/parks/${parkSlug}/visits`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const cacheRefreshed =
          payload.status === "published"
            ? await revalidateVisitPublicViews({ parkSlug, expireImmediately: true })
            : true;
        shouldResetSubmittingState = false;
        router.push(
          createPathWithSearchParams(appRoutes.controlPanel.editVisit(createdVisit.id), {
            created: 1,
            status: payload.status,
            refreshFailed: cacheRefreshed ? null : 1,
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
      showSnackbar({
        message: error instanceof Error ? error.message : String(error),
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    "flex w-full rounded-xl border border-input bg-control px-3 py-2 text-sm ring-offset-background shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]";

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-6">
      {cacheRefreshFailed && visitToEdit !== undefined && (
        <PublicCacheRefreshNotice
          parkSlug={visitToEdit.park.slug}
          tripSlugs={[visitToEdit.trip?.slug]}
          failureMessage={t("savedCacheRefreshFailed")}
          retryLabel={t("retryCacheRefresh")}
          retryingLabel={t("retryingCacheRefresh")}
          successMessage={t("cacheRefreshRetried")}
        />
      )}
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

      <MarkdownEditor
        id="note"
        label={t("noteLabel")}
        value={note}
        onValueChange={setNote}
        placeholder={t("notePlaceholder")}
        inputClassName={inputClassName}
      />

      {!isEditing && <p className="text-sm text-muted-foreground">{t("publishOrDraftHelp")}</p>}
      {isEditing && (
        <p className="text-sm font-medium">
          {status === "published" ? t("publishedStatus") : t("draftStatus")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          disabled={isSubmitting || isNoteTooLong || (isEditing && !isEditDirty)}
        >
          {isSubmitting ? "..." : isEditing ? t("submit") : t("publish")}
        </Button>
        {isEditing === true && isEditDirty === true && (
          <Button
            type="submit"
            name="intent"
            value="preview"
            variant="outline"
            disabled={isSubmitting || isNoteTooLong}
          >
            {t("saveAndPreview")}
          </Button>
        )}
        {!isEditing && (
          <Button
            type="submit"
            name="status"
            value="draft"
            variant="outline"
            disabled={isSubmitting || isNoteTooLong}
          >
            {t("saveDraft")}
          </Button>
        )}
        {isEditing && (
          <Button
            type="submit"
            name="status"
            value={status === "published" ? "draft" : "published"}
            variant="outline"
            disabled={isSubmitting}
          >
            {status === "published" ? t("withdraw") : t("publish")}
          </Button>
        )}
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
