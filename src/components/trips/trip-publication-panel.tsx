"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { TextareaWithCounter } from "@/components/ui/textarea-with-counter";
import { apiAuthFetch } from "@/lib/api";
import type { VisitWithPark } from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";
import { buildTripCoverCandidates } from "@/lib/trip-cover-candidates";
import type { TripDetail } from "@/lib/trips";

export const TripPublicationPanel = ({
  trip,
  visits,
}: {
  trip: TripDetail;
  visits: VisitWithPark[];
}) => {
  const t = useTranslations("controlPanel.trips.editTrip.publication");
  const router = useRouter();
  const candidates = buildTripCoverCandidates(trip, visits);
  const publication = trip.publication;
  const coverReference = publication?.cover as
    | { imageId: number; source: "trip-stop-image" | "visit-image" }
    | null
    | undefined;
  const [summary, setSummary] = useState(publication?.summary ?? "");
  const [featured, setFeatured] = useState(publication?.featured ?? false);
  const [cover, setCover] = useState(
    coverReference ? `${coverReference.source}:${coverReference.imageId}` : "",
  );
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isPublished = publication?.status === "published";
  const save = async (nextStatus?: "published" | "unlisted") => {
    setBusy(true);
    setStatus(null);
    const selected = candidates.find(
      (candidate) => `${candidate.source}:${candidate.id}` === cover,
    );
    const response = await apiAuthFetch(`/api/trips/${trip.id}/publication`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(nextStatus ? { status: nextStatus } : {}),
        cover: selected
          ? { imageId: selected.id, source: selected.source }
          : cover === ""
            ? null
            : undefined,
        featured: nextStatus === "unlisted" ? false : featured,
        summary: summary.trim() || null,
      }),
    }).catch(() => null);
    if (response) {
      await revalidatePublicCache({ tripSlug: trip.slug });
      setStatus(
        nextStatus === "published"
          ? t("published")
          : nextStatus === "unlisted"
            ? t("unlisted")
            : t("saved"),
      );
      router.refresh();
    } else {
      setStatus(t("failed"));
    }
    setBusy(false);
  };
  return (
    <section
      className="mt-8 space-y-5 rounded-3xl border border-white/45 bg-white/56 p-5 shadow-[0_18px_36px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/38"
      aria-labelledby="trip-publication-title"
    >
      <div>
        <h2 id="trip-publication-title" className="text-lg font-semibold">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <label htmlFor="trip-summary" className="block space-y-2 text-sm font-medium">
        <span>{t("summary")}</span>
        <TextareaWithCounter
          id="trip-summary"
          value={summary}
          onValueChange={setSummary}
          maxLength={320}
          rows={4}
        />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("cover")}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="trip-cover"
            checked={cover === ""}
            onChange={() => setCover("")}
          />
          {t("noCover")}
        </label>
        {candidates.map((candidate) => (
          <label
            key={`${candidate.source}:${candidate.id}`}
            className="flex items-center gap-3 text-sm"
          >
            <input
              type="radio"
              name="trip-cover"
              value={`${candidate.source}:${candidate.id}`}
              checked={cover === `${candidate.source}:${candidate.id}`}
              onChange={() => setCover(`${candidate.source}:${candidate.id}`)}
            />
            <AppImage
              src={candidate.thumbUrl}
              alt=""
              width={64}
              height={48}
              className="h-12 w-16 rounded-lg object-cover"
            />
            {candidate.context}
          </label>
        ))}
      </fieldset>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={featured}
          disabled={!isPublished}
          onChange={(event) => setFeatured(event.target.checked)}
        />
        {t("featured")}
      </label>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={busy} onClick={() => void save()}>
          {busy ? t("saving") : t("save")}
        </Button>
        {isPublished ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void save("unlisted")}
          >
            {t("unlist")}
          </Button>
        ) : (
          <Button type="button" disabled={busy} onClick={() => void save("published")}>
            {t("publish")}
          </Button>
        )}
      </div>
      {status !== null && (
        <output aria-live="polite" className="block text-sm text-muted-foreground">
          {status}
        </output>
      )}
    </section>
  );
};
