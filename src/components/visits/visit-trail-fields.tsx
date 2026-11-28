"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { VisitLocationChoices } from "@/lib/parks";

export const VisitTrailFields = ({
  parkSlug,
  selectedIds,
  onChange,
  disabled,
  areaSelection,
  onMainParkChange,
}: {
  parkSlug: string;
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled: boolean;
  onMainParkChange?: (mainPark: VisitLocationChoices["mainPark"]) => void;
  areaSelection?: { ids: number[]; onChange: (ids: number[]) => void };
}) => {
  const t = useTranslations("controlPanel.visits.form");
  const [choices, setChoices] = useState<VisitLocationChoices | null>(null);
  const [failed, setFailed] = useState(false);
  const [request, setRequest] = useState({ parkSlug });
  useEffect(() => {
    let current = true;
    setFailed(false);
    void apiFetch<VisitLocationChoices>(
      `/api/admin/parks/${encodeURIComponent(request.parkSlug)}/visit-trails`,
      {
        cache: "no-store",
      },
    )
      .then((response) => {
        if (current) {
          setChoices(response);
          onMainParkChange?.(response.mainPark);
        }
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [request, onMainParkChange]);
  if (failed)
    return (
      <div>
        <p role="alert" className="text-sm text-destructive">
          {t("trailsLoadFailed")}
        </p>
        <Button type="button" variant="outline" onClick={() => setRequest({ parkSlug })}>
          {t("retryTrails")}
        </Button>
      </div>
    );
  if (choices === null)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("trailsLoading")}
      </p>
    );
  const trails = choices.trails.filter(
    (trail) => trail.effective || selectedIds.includes(trail.trailId),
  );
  const areas =
    choices.areas?.filter((area) => area.active || areaSelection?.ids.includes(area.id)) ?? [];
  return (
    <>
      {areaSelection !== undefined && areas.length > 0 && (
        <VisitLinkedChoices
          label={t("areasLabel")}
          description={t("areasDescription")}
          choices={areas.map((area) => ({
            id: area.id,
            name: area.name,
            status: area.active ? undefined : t("retiredArea"),
          }))}
          selectedIds={areaSelection.ids}
          onChange={areaSelection.onChange}
          disabled={disabled}
        />
      )}
      {trails.length > 0 && (
        <VisitLinkedChoices
          label={t("trailsLabel")}
          description={t("trailsDescription")}
          choices={trails.map((trail) => ({ id: trail.trailId, name: trail.name }))}
          selectedIds={selectedIds}
          onChange={onChange}
          disabled={disabled}
        />
      )}
    </>
  );
};

const VisitLinkedChoices = ({
  label,
  description,
  choices,
  selectedIds,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  choices: { id: number; name: string; status?: string | undefined }[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled: boolean;
}) => (
  <fieldset disabled={disabled} className="space-y-2">
    <legend className="font-medium">{label}</legend>
    <p className="text-sm text-muted-foreground">{description}</p>
    <div className="max-h-72 overflow-y-auto rounded-xl border border-border p-2">
      {choices.map(({ id, name, status }) => (
        <label
          key={id}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 focus-within:ring-2 focus-within:ring-ring"
        >
          <input
            type="checkbox"
            className="h-5 w-5 shrink-0 accent-primary"
            checked={selectedIds.includes(id)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...selectedIds, id]
                  : selectedIds.filter((item) => item !== id),
              )
            }
          />
          <span className="min-w-0 wrap-break-word">
            {name}
            {status !== undefined && (
              <span className="ml-2 text-sm text-muted-foreground">{status}</span>
            )}
          </span>
        </label>
      ))}
    </div>
  </fieldset>
);
