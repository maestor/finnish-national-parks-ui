"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { revalidatePublicCache } from "@/lib/public-cache";
import { appRoutes, createPathWithSearchParams } from "@/lib/routes";
import { formatTripDateRange, type Trip } from "@/lib/trips";

interface TripFormProps {
  tripToEdit?: Trip;
}

export const TripForm = ({ tripToEdit }: TripFormProps) => {
  const t = useTranslations("controlPanel.trips.form");
  const router = useRouter();
  const isEditing = !!tripToEdit;

  const [name, setName] = useState(tripToEdit?.name ?? "");
  const [description, setDescription] = useState(tripToEdit?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState({
    name: tripToEdit?.name ?? "",
    description: tripToEdit?.description ?? "",
  });

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const isEditDirty =
    !tripToEdit || trimmedName !== savedSnapshot.name || description !== savedSnapshot.description;
  const isSubmitDisabled = isSubmitting || (isEditing && !isEditDirty);
  const tripDateRange = tripToEdit ? formatTripDateRange(tripToEdit) : null;

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setSubmitError(null);
    setStatusMessage(null);

    if (!trimmedName) {
      setErrors({ name: t("validation.nameRequired") });
      return;
    }

    if (isEditing && !isEditDirty) {
      return;
    }

    const payload = {
      name: trimmedName,
      description: trimmedDescription || null,
    };

    let shouldResetSubmittingState = true;
    setIsSubmitting(true);

    try {
      if (tripToEdit) {
        await apiFetch(`/api/trips/${tripToEdit.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        await revalidatePublicCache();
        setSavedSnapshot({
          name: trimmedName,
          description,
        });
        setStatusMessage(t("updateSuccess"));
        router.refresh();
      } else {
        const createdTrip = await apiFetch<Trip>("/api/trips", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await revalidatePublicCache();
        shouldResetSubmittingState = false;
        router.push(
          createPathWithSearchParams(appRoutes.controlPanel.editTrip(createdTrip.id), {
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
    if (!tripToEdit) {
      return;
    }

    if (!window.confirm(t("deleteConfirm", { tripName: tripToEdit.name }))) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await apiFetch(`/api/trips/${tripToEdit.id}`, { method: "DELETE" });
      await revalidatePublicCache();
      router.push(appRoutes.controlPanel.trips);
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
    <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-6">
      {tripToEdit ? (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/45 bg-white/58 p-4 shadow-[0_18px_36px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/40 dark:shadow-[0_22px_40px_rgba(2,6,23,0.28)]">
            <p className="text-sm font-medium text-muted-foreground">{t("dateRangeLabel")}</p>
            <p className="mt-2 text-base font-semibold">{tripDateRange ?? t("noDateRange")}</p>
          </div>
          <div className="rounded-[1.5rem] border border-white/45 bg-white/58 p-4 shadow-[0_18px_36px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/40 dark:shadow-[0_22px_40px_rgba(2,6,23,0.28)]">
            <p className="text-sm font-medium text-muted-foreground">{t("visitCountLabel")}</p>
            <p className="mt-2 text-base font-semibold">
              {t("visitCountValue", { count: tripToEdit.visitCount })}
            </p>
          </div>
        </section>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="trip-name" required>
          {t("nameLabel")}
        </Label>
        <input
          id="trip-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("namePlaceholder")}
          className={`${inputClassName} h-10`}
        />
        {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="trip-description">{t("descriptionLabel")}</Label>
        <textarea
          id="trip-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("descriptionPlaceholder")}
          rows={5}
          className={`${inputClassName} resize-y`}
        />
      </div>

      {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
      {statusMessage ? (
        <output
          aria-live="polite"
          className="block rounded-[1.3rem] border border-emerald-600/20 bg-[linear-gradient(118deg,rgba(22,101,52,0.14),rgba(15,118,110,0.08))] px-4 py-3 text-sm text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] dark:border-emerald-300/18 dark:text-emerald-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
        >
          <span>{statusMessage}</span>{" "}
          <Link
            href={appRoutes.controlPanel.trips}
            className="font-medium underline underline-offset-4 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:text-emerald-100"
          >
            {t("viewAllTrips")}
          </Link>
        </output>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isSubmitDisabled}>
          {isSubmitting ? "..." : t("submit")}
        </Button>
        {tripToEdit ? (
          <>
            <Link
              href={createPathWithSearchParams(appRoutes.controlPanel.newVisit, {
                trip: tripToEdit.id,
              })}
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
        ) : null}
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
