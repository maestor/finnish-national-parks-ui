"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { ApiError, apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { YearReviewPublishInfo, YearReviewPublishResponse } from "@/lib/year-review";

interface YearReviewPublishControlsProps {
  publishInfo: YearReviewPublishInfo;
  status: "draft" | "published";
  year: number;
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("fi-FI", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Helsinki",
});

const formatDateTime = (value: string) => DATE_TIME_FORMATTER.format(new Date(value));

const YearReviewPublishControls = ({
  publishInfo,
  status,
  year,
}: YearReviewPublishControlsProps) => {
  const t = useTranslations("controlPanel.yearReview");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [lastPublishedSharePath, setLastPublishedSharePath] = useState(publishInfo.sharePath);
  const [lastPublishedAt, setLastPublishedAt] = useState(publishInfo.publishedAt);

  const handlePublish = () => {
    setError(null);

    startTransition(async () => {
      try {
        const response = await apiFetch<YearReviewPublishResponse>(
          `/api/year-review/${year}/publish`,
          {
            method: "POST",
          },
        );
        setLastPublishedSharePath(response.sharePath);
        setLastPublishedAt(response.publishedAt);
        router.refresh();
      } catch (caughtError) {
        if (caughtError instanceof ApiError) {
          setError(caughtError.message);
          return;
        }

        setError(t("actionFailed"));
      }
    });
  };

  const handleUnpublish = () => {
    setError(null);

    startTransition(async () => {
      try {
        await apiFetch(`/api/year-review/${year}/publish`, {
          method: "DELETE",
        });
        setLastPublishedSharePath(null);
        setLastPublishedAt(null);
        router.refresh();
      } catch (caughtError) {
        if (caughtError instanceof ApiError) {
          setError(caughtError.message);
          return;
        }

        setError(t("actionFailed"));
      }
    });
  };

  const sharePath = publishInfo.sharePath ?? lastPublishedSharePath;
  const publishedAt = publishInfo.publishedAt ?? lastPublishedAt;
  const isPublished = status === "published" || sharePath !== null;
  const hasError = error !== null;
  const hasPublishedAt = publishedAt !== null;
  const hasSharePath = sharePath !== null;

  return (
    <section className="rounded-3xl border border-white/45 bg-white/70 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/56 dark:shadow-[0_24px_52px_rgba(2,6,23,0.28)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                isPublished
                  ? "bg-emerald-600/12 text-emerald-800 dark:bg-emerald-400/16 dark:text-emerald-100"
                  : "bg-slate-900/7 text-slate-700 dark:bg-white/10 dark:text-slate-200",
              )}
            >
              {isPublished ? t("publishedStatus") : t("draftStatus")}
            </span>
            {hasPublishedAt && (
              <span className="text-sm text-muted-foreground">
                {t("publishedAt", { date: formatDateTime(publishedAt) })}
              </span>
            )}
          </div>

          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t("previewOnly")}</p>

          {hasSharePath && (
            <div className="flex flex-wrap items-center gap-3">
              <CopyLinkButton
                href={sharePath}
                label={t("copyShareLink")}
                copiedLabel={t("shareLinkCopied")}
                tooltipSide="top"
                className="inline-flex items-center justify-center rounded-md border border-white/45 bg-white/78 p-2 text-foreground shadow-sm transition-colors hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/58 dark:hover:bg-slate-950/74"
                iconClassName="h-4 w-4"
              />
              <Link
                href={sharePath}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("openSharePage")}
              </Link>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant={isPublished ? "outline" : "default"}
            onClick={handlePublish}
            disabled={isPending}
          >
            {isPublished ? t("republish") : t("publish")}
          </Button>
          {isPublished === true && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleUnpublish}
              disabled={isPending}
            >
              {t("unpublish")}
            </Button>
          )}
        </div>
      </div>

      {hasError && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
};

export { YearReviewPublishControls };
