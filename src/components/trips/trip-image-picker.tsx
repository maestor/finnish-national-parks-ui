"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { TripImageCandidate, TripImageReference } from "@/lib/trips";

interface TripImagePickerProps {
  initialSelection: TripImageCandidate | null;
  onClose: () => void;
  onSaved: (selection: TripImageCandidate | null) => Promise<void> | void;
  open: boolean;
  tripId: number;
}

const candidateKey = (candidate: TripImageCandidate) =>
  `${candidate.reference.source}:${candidate.reference.imageId}`;

export const TripImagePicker = ({
  initialSelection,
  onClose,
  onSaved,
  open,
  tripId,
}: TripImagePickerProps) => {
  const t = useTranslations("controlPanel.trips.featuredImage.picker");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [images, setImages] = useState<TripImageCandidate[]>([]);
  const [selection, setSelection] = useState<TripImageCandidate | null>(initialSelection);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("idle");

  useEffect(() => {
    setSelection(initialSelection);
  }, [initialSelection]);

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current.showModal();
    closeButtonRef.current?.focus();
    return () => {
      if (dialogRef.current?.open) dialogRef.current.close();
    };
  }, [open]);

  const loadImages = useCallback(
    async (offset: number, replace: boolean) => {
      setStatus("loading");
      try {
        const response = await apiFetch<{
          images: TripImageCandidate[];
          nextOffset: number | null;
        }>(`/api/admin/trips/${tripId}/images?offset=${offset}&limit=48`);
        setImages((current) => (replace ? response.images : [...current, ...response.images]));
        setNextOffset(response.nextOffset);
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    },
    [tripId],
  );

  useEffect(() => {
    if (open) {
      setImages([]);
      setNextOffset(0);
      void loadImages(0, true);
    }
  }, [loadImages, open]);

  const close = () => {
    if (status === "saving") return;
    dialogRef.current?.close();
    onClose();
    openerRef.current?.focus();
  };

  const save = async () => {
    if (status === "saving") return;
    setStatus("saving");
    try {
      const reference: TripImageReference | null = selection?.reference ?? null;
      const response = await apiFetch<{ featuredImage: TripImageCandidate | null }>(
        `/api/admin/trips/${tripId}/featured-image`,
        { body: JSON.stringify({ featuredImage: reference }), method: "PATCH" },
      );
      await onSaved(response.featuredImage);
      setStatus("idle");
      close();
    } catch {
      setStatus("error");
    }
  };

  const selectionChanged =
    (selection === null ? null : candidateKey(selection)) !==
    (initialSelection === null ? null : candidateKey(initialSelection));

  if (!open) return null;
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="trip-image-picker-title"
      className="m-auto max-h-[min(90dvh,48rem)] w-[min(92vw,54rem)] rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-slate-950/60"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="flex max-h-[min(90dvh,48rem)] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id="trip-image-picker-title" className="text-lg font-semibold">
              {t("title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={close} aria-label={t("close")}>
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto p-5" aria-busy={status === "loading"}>
          {status === "error" && <p role="alert">{t("error")}</p>}
          {status === "idle" && images.length === 0 && <p>{t("empty")}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((candidate) => {
              const selected =
                selection !== null && candidateKey(selection) === candidateKey(candidate);
              return (
                <button
                  key={candidateKey(candidate)}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${candidate.sourceLabel}, ${candidate.visitedOn}, ${candidate.image.originalName ?? candidate.image.id}`}
                  className={cn(
                    "relative overflow-hidden rounded-xl border border-border bg-background text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected && "border-primary bg-primary/10 ring-2 ring-primary",
                  )}
                  onClick={() => setSelection(candidate)}
                >
                  <AppImage
                    src={candidate.image.thumbUrl}
                    alt=""
                    width={candidate.image.thumbWidth ?? 240}
                    height={candidate.image.thumbHeight ?? 160}
                    className="aspect-[3/2] w-full object-cover"
                    unoptimized
                  />
                  <span className="block p-2 text-xs">{candidate.sourceLabel}</span>
                  {selected === true && (
                    <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                      {t("selected")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {nextOffset !== null && status !== "loading" && (
            <Button
              className="mt-4"
              type="button"
              variant="outline"
              onClick={() => void loadImages(nextOffset, false)}
            >
              {t("loadMore")}
            </Button>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-5">
          <Button type="button" variant="outline" onClick={close} disabled={status === "saving"}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={status === "saving" || selectionChanged === false}
          >
            {status === "saving" ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
};
