"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";

type TrailResponse =
  paths["/api/admin/parks/{slug}/visit-trails"]["get"]["responses"][200]["content"]["application/json"];

export const VisitTrailFields = ({
  parkSlug,
  selectedIds,
  onChange,
  disabled,
}: {
  parkSlug: string;
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled: boolean;
}) => {
  const t = useTranslations("controlPanel.visits.form");
  const [trails, setTrails] = useState<TrailResponse["trails"] | null>(null);
  const [failed, setFailed] = useState(false);
  const [request, setRequest] = useState({ parkSlug });
  useEffect(() => {
    let current = true;
    setFailed(false);
    void apiFetch<TrailResponse>(
      `/api/admin/parks/${encodeURIComponent(request.parkSlug)}/visit-trails`,
      {
        cache: "no-store",
      },
    )
      .then((response) => {
        if (current) setTrails(response.trails);
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [request]);
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
  if (trails === null)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("trailsLoading")}
      </p>
    );
  const choices = trails.filter((trail) => trail.effective || selectedIds.includes(trail.trailId));
  if (choices.length === 0) return null;
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="font-medium">{t("trailsLabel")}</legend>
      <p className="text-sm text-muted-foreground">{t("trailsDescription")}</p>
      <div className="max-h-72 overflow-y-auto rounded-xl border border-border p-2">
        {choices.map((trail) => (
          <label
            key={trail.trailId}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 focus-within:ring-2 focus-within:ring-ring"
          >
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 accent-primary"
              checked={selectedIds.includes(trail.trailId)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selectedIds, trail.trailId]
                    : selectedIds.filter((id) => id !== trail.trailId),
                )
              }
            />
            <span className="min-w-0 wrap-break-word">{trail.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
};
