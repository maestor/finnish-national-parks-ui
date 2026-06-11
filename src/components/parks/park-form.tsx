"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import type { ParkDetail, ParkUpdateRequest, ParkUpdateResponse } from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

interface ParkFormProps {
  park: ParkDetail;
}

interface ParkFormState {
  areaKm2: string;
  displayTypeName: string;
  establishmentYear: string;
  locationLabel: string;
  luontoonUrl: string;
  name: string;
  postalCode: string;
  postalOffice: string;
  slug: string;
}

const INPUT_CLASS_NAME =
  "flex w-full rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm ring-offset-background shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

const createInitialState = (park: ParkDetail): ParkFormState => ({
  areaKm2: park.areaKm2 === null ? "" : String(park.areaKm2),
  displayTypeName: park.displayTypeName ?? "",
  establishmentYear: park.establishmentYear === null ? "" : String(park.establishmentYear),
  locationLabel: park.location,
  luontoonUrl: park.luontoonUrl ?? "",
  name: park.name,
  postalCode: "",
  postalOffice: park.postalOffice ?? "",
  slug: park.slug,
});

const trimToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const parseOptionalNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  return Number(trimmed);
};

const isFiniteNumber = (value: number | null): value is number =>
  value !== null && Number.isFinite(value);

export const ParkForm = ({ park }: ParkFormProps) => {
  const t = useTranslations("controlPanel.parks.edit.form");
  const router = useRouter();
  const initialState = useMemo(() => createInitialState(park), [park]);
  const [formState, setFormState] = useState(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isNavigationPending, startTransition] = useTransition();
  const isPending = isSubmitting || isNavigationPending;

  const isDirty = Object.entries(formState).some(([key, value]) => {
    const initialValue = initialState[key as keyof ParkFormState];
    return value !== initialValue;
  });

  const setFieldValue = <Key extends keyof ParkFormState>(
    field: Key,
    value: ParkFormState[Key],
  ) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleBack = () => {
    router.push("/control-panel/parks");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setSubmitError(null);

    const nextErrors: Record<string, string> = {};
    if (formState.name.trim() === "") {
      nextErrors.name = t("validation.nameRequired");
    }
    if (formState.slug.trim() === "") {
      nextErrors.slug = t("validation.slugRequired");
    }
    if (formState.locationLabel.trim() === "") {
      nextErrors.locationLabel = t("validation.locationRequired");
    }

    const parsedAreaKm2 = parseOptionalNumber(formState.areaKm2);
    if (formState.areaKm2.trim() !== "" && !isFiniteNumber(parsedAreaKm2)) {
      nextErrors.areaKm2 = t("validation.areaInvalid");
    }

    const parsedEstablishmentYear = parseOptionalNumber(formState.establishmentYear);
    if (formState.establishmentYear.trim() !== "" && !Number.isInteger(parsedEstablishmentYear)) {
      nextErrors.establishmentYear = t("validation.establishedInvalid");
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!isDirty) {
      return;
    }

    const payload: ParkUpdateRequest = {};
    if (formState.name !== initialState.name) {
      payload.name = formState.name.trim();
    }
    if (formState.slug !== initialState.slug) {
      payload.slug = formState.slug.trim();
    }
    if (formState.locationLabel !== initialState.locationLabel) {
      payload.locationLabel = formState.locationLabel.trim();
    }
    if (formState.displayTypeName !== initialState.displayTypeName) {
      payload.displayTypeName = trimToNull(formState.displayTypeName);
    }
    if (formState.luontoonUrl !== initialState.luontoonUrl) {
      payload.luontoonUrl = trimToNull(formState.luontoonUrl);
    }
    if (formState.postalOffice !== initialState.postalOffice) {
      payload.postalOffice = trimToNull(formState.postalOffice);
    }
    if (formState.postalCode !== initialState.postalCode) {
      payload.postalCode = trimToNull(formState.postalCode);
    }
    if (formState.areaKm2 !== initialState.areaKm2) {
      payload.areaKm2 = parsedAreaKm2;
    }
    if (formState.establishmentYear !== initialState.establishmentYear) {
      payload.establishmentYear = parsedEstablishmentYear;
    }

    setIsSubmitting(true);

    try {
      const updatedPark = await apiFetch<ParkUpdateResponse>(`/api/parks/${park.slug}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      await Promise.all([
        revalidatePublicCache({ parkSlug: park.slug }),
        updatedPark.slug !== park.slug
          ? revalidatePublicCache({ parkSlug: updatedPark.slug })
          : Promise.resolve(true),
      ]);

      startTransition(() => {
        router.replace(`/control-panel/parks/${updatedPark.slug}/edit?updated=1`);
        router.refresh();
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="park-name" required>
            {t("nameLabel")}
          </Label>
          <input
            id="park-name"
            type="text"
            value={formState.name}
            onChange={(event) => setFieldValue("name", event.target.value)}
            className={`${INPUT_CLASS_NAME} h-10`}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="park-slug" required>
            {t("slugLabel")}
          </Label>
          <input
            id="park-slug"
            type="text"
            value={formState.slug}
            onChange={(event) => setFieldValue("slug", event.target.value)}
            className={`${INPUT_CLASS_NAME} h-10`}
          />
          {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="park-display-type">{t("displayTypeNameLabel")}</Label>
          <input
            id="park-display-type"
            type="text"
            value={formState.displayTypeName}
            onChange={(event) => setFieldValue("displayTypeName", event.target.value)}
            className={`${INPUT_CLASS_NAME} h-10`}
            placeholder={t("displayTypeNamePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="park-luontoon-url">{t("luontoonUrlLabel")}</Label>
          <input
            id="park-luontoon-url"
            type="url"
            value={formState.luontoonUrl}
            onChange={(event) => setFieldValue("luontoonUrl", event.target.value)}
            className={`${INPUT_CLASS_NAME} h-10`}
            placeholder="https://"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="park-area">{t("areaLabel")}</Label>
          <input
            id="park-area"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={formState.areaKm2}
            onChange={(event) => setFieldValue("areaKm2", event.target.value)}
            className={`${INPUT_CLASS_NAME} h-10`}
          />
          {errors.areaKm2 && <p className="text-sm text-destructive">{errors.areaKm2}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="park-established">{t("establishedLabel")}</Label>
          <input
            id="park-established"
            type="number"
            inputMode="numeric"
            step="1"
            value={formState.establishmentYear}
            onChange={(event) => setFieldValue("establishmentYear", event.target.value)}
            className={`${INPUT_CLASS_NAME} h-10`}
          />
          {errors.establishmentYear && (
            <p className="text-sm text-destructive">{errors.establishmentYear}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="park-location" required>
            {t("locationLabel")}
          </Label>
          <input
            id="park-location"
            type="text"
            value={formState.locationLabel}
            onChange={(event) => setFieldValue("locationLabel", event.target.value)}
            className={`${INPUT_CLASS_NAME} h-10`}
          />
          {errors.locationLabel && (
            <p className="text-sm text-destructive">{errors.locationLabel}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="park-postal-code">{t("postalCodeLabel")}</Label>
          <input
            id="park-postal-code"
            type="text"
            inputMode="numeric"
            value={formState.postalCode}
            onChange={(event) => setFieldValue("postalCode", event.target.value)}
            className={`${INPUT_CLASS_NAME} h-10`}
            placeholder={t("postalCodePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="park-postal-office">{t("postalOfficeLabel")}</Label>
          <input
            id="park-postal-office"
            type="text"
            value={formState.postalOffice}
            onChange={(event) => setFieldValue("postalOffice", event.target.value)}
            className={`${INPUT_CLASS_NAME} h-10`}
          />
        </div>
      </div>

      {submitError && <p className="text-sm text-destructive">{submitError}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isPending || !isDirty}>
          {isPending ? "..." : t("submit")}
        </Button>
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
