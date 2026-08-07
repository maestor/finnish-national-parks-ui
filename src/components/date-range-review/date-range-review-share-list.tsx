"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { ApiError, apiFetch } from "@/lib/api";
import type { AdminDateRangeReviewShare } from "@/lib/date-range-review";
import { appRoutes, createPathWithSearchParams } from "@/lib/routes";

interface DateRangeReviewShareListProps {
  shares: AdminDateRangeReviewShare[];
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("fi-FI", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Helsinki",
});

const formatDateTime = (value: string) => DATE_TIME_FORMATTER.format(new Date(value));

export const DateRangeReviewShareList = ({ shares }: DateRangeReviewShareListProps) => {
  const t = useTranslations("controlPanel.dateRangeReview");
  const [localShares, setLocalShares] = useState(shares);
  const [pendingShareId, setPendingShareId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setLocalShares(shares);
  }, [shares]);

  const removeShare = async (share: AdminDateRangeReviewShare) => {
    const confirmed = window.confirm(
      t("confirmRemoveShare", {
        name: share.overview.name,
      }),
    );

    if (!confirmed) {
      return;
    }

    setPendingShareId(share.shareId);
    setActionError(null);

    try {
      await apiFetch(`/api/admin/date-range-review/shares/${share.shareId}`, {
        method: "DELETE",
      });
      setLocalShares((current) =>
        current.filter((currentShare) => currentShare.shareId !== share.shareId),
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError(t("removeShareFailed"));
      }
    } finally {
      setPendingShareId(null);
    }
  };

  if (localShares.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-white/45 bg-white/58 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/42">
        <div className="mx-auto max-w-2xl space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">{t("emptySharesTitle")}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{t("emptySharesDescription")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">{t("tabs.shares")}</h2>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {t("sharesDescription")}
        </p>
      </div>

      {actionError !== null && (
        <p
          className="rounded-[1.3rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          role="alert"
        >
          {actionError}
        </p>
      )}

      <div className="grid gap-4">
        {localShares.map((share) => {
          const isRemoving = pendingShareId === share.shareId;
          const previewHref = createPathWithSearchParams(appRoutes.controlPanel.dateRangeReview, {
            tab: "preview",
            endDate: share.overview.endDate,
            name: share.overview.name,
            startDate: share.overview.startDate,
          });

          return (
            <article
              key={share.shareId}
              className="rounded-3xl border border-white/45 bg-white/70 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/56 dark:shadow-[0_24px_52px_rgba(2,6,23,0.28)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-tight">{share.overview.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {share.overview.startDate} - {share.overview.endDate}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                    <span>{t("publishedAt", { date: formatDateTime(share.publishedAt) })}</span>
                    <span>
                      {t("summary", {
                        imageCount: share.storySummary.imageCount,
                        tripCount: share.storySummary.tripCount,
                        visitCount: share.storySummary.visitCount,
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={previewHref}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-white/45 bg-white/78 px-4 py-2 text-sm font-medium text-foreground shadow-[0_10px_24px_rgba(148,163,184,0.18)] backdrop-blur-md transition-colors hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/58 dark:hover:bg-slate-950/74 dark:shadow-[0_16px_32px_rgba(2,6,23,0.28)]"
                  >
                    {t("moveToPreview")}
                  </Link>
                  <CopyLinkButton
                    href={share.sharePath}
                    label={t("copyShareLink")}
                    copiedLabel={t("shareLinkCopied")}
                    tooltipSide="top"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/45 bg-white/78 text-foreground shadow-[0_10px_24px_rgba(148,163,184,0.18)] backdrop-blur-md transition-colors hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/58 dark:hover:bg-slate-950/74 dark:shadow-[0_16px_32px_rgba(2,6,23,0.28)]"
                    iconClassName="h-4 w-4"
                  />
                  <Link
                    href={share.sharePath}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("openSharePage")}
                  </Link>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      void removeShare(share);
                    }}
                    disabled={isRemoving}
                  >
                    {t("removeShare")}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
