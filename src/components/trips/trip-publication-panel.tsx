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

const INPUT_CLASS_NAME =
  "flex w-full rounded-xl border border-white/45 bg-white/78 px-3 py-2 text-sm ring-offset-background shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

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
    <section className="mt-10 space-y-6" aria-labelledby="trip-publication-title">
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
          className={`${INPUT_CLASS_NAME} resize-y`}
        />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("cover")}</legend>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="flex items-center gap-2 rounded-xl border border-dashed border-white/45 bg-white/40 p-3 text-sm dark:border-white/10 dark:bg-slate-950/28">
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
              className="flex min-w-0 items-center gap-3 rounded-xl border border-white/45 bg-white/40 p-3 text-sm dark:border-white/10 dark:bg-slate-950/28"
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
                className="h-12 w-16 shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0">{candidate.context}</span>
            </label>
          ))}
        </div>
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
