"use client";

import { ImageIcon, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { FeaturedImagePicker } from "@/components/ui/featured-image-picker";
import { apiFetch } from "@/lib/api";
import type { ParkFeaturedImageSettings, ParkImageSelection } from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";

export const ParkFeaturedImageSection = ({ slug }: { slug: string }) => {
  const t = useTranslations("controlPanel.parks.featuredImage");
  const endpoint = `/api/admin/parks/${encodeURIComponent(slug)}`;
  const [selection, setSelection] = useState<ParkImageSelection | null>(null);
  const [hasImages, setHasImages] = useState(false);
  const [open, setOpen] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const loadIdRef = useRef(0);
  const load = useCallback(async () => {
    const loadId = ++loadIdRef.current;
    setLoadState("loading");
    try {
      const response = await apiFetch<ParkFeaturedImageSettings>(`${endpoint}/featured-image`);
      if (loadId === loadIdRef.current) {
        setSelection(response.featuredImage);
        setHasImages(response.hasImages);
        setLoadState("ready");
      }
    } catch {
      if (loadId === loadIdRef.current) setLoadState("error");
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
    return () => {
      loadIdRef.current += 1;
    };
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    const refreshed = await revalidatePublicCache({ parkSlug: slug, expireImmediately: true });
    setRefreshFailed(!refreshed);
    setRefreshing(false);
  };

  const saved = async (next: ParkImageSelection | null) => {
    setSelection(next);
    await refresh();
  };

  const remove = async () => {
    setRemoving(true);
    setRemoveError(false);
    try {
      await apiFetch(`${endpoint}/featured-image`, {
        method: "PATCH",
        body: JSON.stringify({ featuredImage: null }),
      });
      setSelection(null);
      await refresh();
    } catch {
      setRemoveError(true);
    } finally {
      setRemoving(false);
    }
  };

  if (loadState === "loading" || (loadState === "ready" && !hasImages)) return null;

  return (
    <section
      className="mt-8 rounded-2xl border border-border bg-card p-5"
      aria-labelledby="park-featured-image-title"
    >
      <h2 id="park-featured-image-title" className="flex items-center gap-2 text-lg font-semibold">
        <ImageIcon className="h-5 w-5" aria-hidden="true" />
        {t("title")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
      {loadState === "error" && (
        <div className="mt-4">
          <p role="alert">{t("loadFailed")}</p>
          <Button type="button" variant="outline" onClick={() => void load()}>
            {t("retry")}
          </Button>
        </div>
      )}
      {loadState === "ready" && (
        <>
          {selection !== null ? (
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <AppImage
                src={selection.image.thumbUrl}
                alt=""
                width={240}
                height={160}
                unoptimized
                privateMedia
                className="h-32 w-48 rounded-xl object-cover"
              />
              <p className="text-sm">
                {selection.sourceLabel} · {selection.visitedOn}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{t("empty")}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={removing || refreshing}
              onClick={() => setOpen(true)}
            >
              {selection === null ? t("choose") : t("change")}
            </Button>
            {selection !== null && (
              <Button
                type="button"
                variant="destructive"
                disabled={removing || refreshing}
                onClick={() => void remove()}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t("remove")}
              </Button>
            )}
          </div>
        </>
      )}
      {removeError === true && (
        <p role="alert" className="mt-4">
          {t("removeFailed")}
        </p>
      )}
      {refreshFailed === true && (
        <div className="mt-4">
          <p role="alert">{t("refreshFailed")}</p>
          <Button
            type="button"
            variant="outline"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            {t("retryRefresh")}
          </Button>
        </div>
      )}
      <FeaturedImagePicker
        initialSelection={selection}
        open={open && hasImages}
        onClose={() => setOpen(false)}
        onSaved={saved}
        endpoint={endpoint}
        translationNamespace="controlPanel.parks.featuredImage.picker"
      />
    </section>
  );
};
