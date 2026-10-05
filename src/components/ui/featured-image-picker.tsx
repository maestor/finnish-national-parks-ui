"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSnackbar } from "@/components/providers/snackbar-provider";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { TripImageCandidate, TripImageReference } from "@/lib/trips";

interface FeaturedImagePickerProps<Candidate extends TripImageCandidate> {
  initialSelection: Candidate | null;
  onClose: () => void;
  onSaved: (selection: Candidate | null) => Promise<void> | void;
  open: boolean;
  endpoint: string;
  translationNamespace:
    | "controlPanel.trips.featuredImage.picker"
    | "controlPanel.parks.featuredImage.picker";
}

const candidateKey = (candidate: TripImageCandidate) =>
  `${candidate.reference.source}:${candidate.reference.imageId}`;

export const FeaturedImagePicker = <Candidate extends TripImageCandidate>({
  initialSelection,
  onClose,
  onSaved,
  open,
  endpoint,
  translationNamespace,
}: FeaturedImagePickerProps<Candidate>) => {
  const t = useTranslations(translationNamespace);
  const { showSnackbar } = useSnackbar();
  const errorMessage = t("error");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const loadRequestRef = useRef(0);
  const [images, setImages] = useState<Candidate[]>([]);
  const [selection, setSelection] = useState<Candidate | null>(initialSelection);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("idle");

  useEffect(() => {
    if (open) setSelection(initialSelection);
  }, [initialSelection, open]);

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
      const requestId = ++loadRequestRef.current;
      setStatus("loading");
      try {
        const response = await apiFetch<{ images: Candidate[]; nextOffset: number | null }>(
          `${endpoint}/images?offset=${offset}&limit=48`,
        );
        if (requestId !== loadRequestRef.current) return;
        setImages((current) => (replace ? response.images : [...current, ...response.images]));
        setNextOffset(response.nextOffset);
        setStatus("idle");
      } catch {
        if (requestId !== loadRequestRef.current) return;
        setStatus("error");
        showSnackbar({ message: errorMessage, tone: "error" });
      }
    },
    [endpoint, errorMessage, showSnackbar],
  );

  useEffect(() => {
    if (!open) return;
    setImages([]);
    setNextOffset(0);
    void loadImages(0, true);
    return () => {
      loadRequestRef.current += 1;
    };
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
      const response = await apiFetch<{ featuredImage: Candidate | null }>(
        `${endpoint}/featured-image`,
        { body: JSON.stringify({ featuredImage: reference }), method: "PATCH" },
      );
      await onSaved(response.featuredImage);
      setStatus("idle");
      dialogRef.current?.close();
      onClose();
      openerRef.current?.focus();
    } catch {
      setStatus("error");
      showSnackbar({ message: errorMessage, tone: "error" });
    }
  };

  const selectionChanged =
    (selection === null ? null : candidateKey(selection)) !==
    (initialSelection === null ? null : candidateKey(initialSelection));

  if (!open) return null;
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby="featured-image-picker-title"
      className="m-auto max-h-[min(90dvh,48rem)] w-[min(92vw,54rem)] rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-hero/60"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="flex max-h-[min(90dvh,48rem)] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id="featured-image-picker-title" className="text-lg font-semibold">
              {t("title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
          </div>
          <button
            ref={closeButtonRef}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
            onClick={close}
            aria-label={t("close")}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto p-5" aria-busy={status === "loading"}>
          {status === "loading" && <p role="status">{t("loading")}</p>}
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
                    privateMedia
                  />
                  <span className="block p-2 text-xs">
                    {candidate.sourceLabel} · {candidate.visitedOn}
                  </span>
                  {candidate.isPubliclyVisible === false && (
                    <span className="block px-2 pb-2 text-xs">{t("unpublished")}</span>
                  )}
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
