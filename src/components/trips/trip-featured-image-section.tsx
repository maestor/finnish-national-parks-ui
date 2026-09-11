"use client";

import { ImageIcon, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { revalidatePublicCache } from "@/lib/public-cache";
import type { TripImageCandidate } from "@/lib/trips";
import { TripImagePicker } from "./trip-image-picker";

interface TripFeaturedImageSectionProps {
  slug: string;
  tripId: number;
}

export const TripFeaturedImageSection = ({ slug, tripId }: TripFeaturedImageSectionProps) => {
  const t = useTranslations("controlPanel.trips.featuredImage");
  const [selection, setSelection] = useState<TripImageCandidate | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.resolve(
      apiFetch<{ featuredImage: TripImageCandidate | null }>(
        `/api/admin/trips/${tripId}/featured-image`,
      ),
    )
      .then((response) => {
        if (active) {
          setSelection(response.featuredImage);
          setLoaded(true);
        }
      })
      .catch(() => setLoaded(true));
    return () => {
      active = false;
    };
  }, [tripId]);

  const saved = async (nextSelection: TripImageCandidate | null) => {
    setSelection(nextSelection);
    await revalidatePublicCache({ tripSlug: slug });
  };

  const remove = async () => {
    await apiFetch(`/api/admin/trips/${tripId}/featured-image`, {
      body: JSON.stringify({ featuredImage: null }),
      method: "PATCH",
    });
    setSelection(null);
    await revalidatePublicCache({ tripSlug: slug });
  };

  return (
    <section
      className="mt-8 rounded-2xl border border-border bg-card p-5"
      aria-labelledby="trip-featured-image-title"
    >
      <h2 id="trip-featured-image-title" className="flex items-center gap-2 text-lg font-semibold">
        <ImageIcon className="h-5 w-5" aria-hidden="true" />
        {t("title")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
      {loaded && selection !== null ? (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <AppImage
            src={selection.image.thumbUrl}
            alt=""
            width={240}
            height={160}
            className="h-32 w-48 rounded-xl object-cover"
            unoptimized
          />
          <p className="text-sm">
            {selection.sourceLabel} · {selection.visitedOn}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{t("empty")}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          {selection === null ? t("choose") : t("change")}
        </Button>
        {selection !== null && (
          <Button type="button" variant="destructive" onClick={() => void remove()}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t("remove")}
          </Button>
        )}
      </div>
      <TripImagePicker
        initialSelection={selection}
        onClose={() => setOpen(false)}
        onSaved={saved}
        open={open}
        tripId={tripId}
      />
    </section>
  );
};
