"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSnackbar } from "@/components/providers/snackbar-provider";
import { AppImage } from "@/components/ui/app-image";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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
  const loadRequestRef = useRef(0);
  const [images, setImages] = useState<Candidate[]>([]);
  const [selection, setSelection] = useState<Candidate | null>(initialSelection);
  const [nextOffset, setNextOffset] = useState<number | null>(0);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("idle");

  useEffect(() => {
    if (open) setSelection(initialSelection);
  }, [initialSelection, open]);

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
    onClose();
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
      onClose();
    } catch {
      setStatus("error");
      showSnackbar({ message: errorMessage, tone: "error" });
    }
  };

  const selectionChanged =
    (selection === null ? null : candidateKey(selection)) !==
    (initialSelection === null ? null : candidateKey(initialSelection));

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t("title")}
      description={t("description")}
      closeLabel={t("close")}
      dismissible={status !== "saving"}
      className="w-[min(92vw,54rem)]"
    >
      {(dismiss) => (
        <>
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
            <Button
              type="button"
              variant="outline"
              onClick={dismiss}
              disabled={status === "saving"}
            >
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
        </>
      )}
    </Dialog>
  );
};
