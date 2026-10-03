"use client";

import { useState } from "react";
import { revalidatePublicCache } from "@/lib/public-cache";

interface PublicCacheRefreshNoticeProps {
  parkSlug?: string | null;
  parkSlugs?: Array<string | null | undefined>;
  tripSlugs?: Array<string | null | undefined>;
  failureMessage: string;
  retryLabel: string;
  retryingLabel: string;
  successMessage: string;
}

export const PublicCacheRefreshNotice = ({
  parkSlug = null,
  parkSlugs = [],
  tripSlugs = [],
  failureMessage,
  retryLabel,
  retryingLabel,
  successMessage,
}: PublicCacheRefreshNoticeProps) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [didRetrySucceed, setDidRetrySucceed] = useState(false);

  const retry = async () => {
    setIsRetrying(true);
    const uniqueTripSlugs = [...new Set(tripSlugs.filter((slug): slug is string => Boolean(slug)))];
    const uniqueParkSlugs = [
      ...new Set([parkSlug, ...parkSlugs].filter((slug): slug is string => Boolean(slug))),
    ];
    const targetTripSlugs = uniqueTripSlugs.length > 0 ? uniqueTripSlugs : [null];
    const targetParkSlugs = uniqueParkSlugs.length > 0 ? uniqueParkSlugs : [null];
    const results = await Promise.all(
      targetTripSlugs.flatMap((tripSlug) =>
        targetParkSlugs.map((nextParkSlug) =>
          revalidatePublicCache({ expireImmediately: true, parkSlug: nextParkSlug, tripSlug }),
        ),
      ),
    );
    setDidRetrySucceed(results.every(Boolean));
    setIsRetrying(false);
  };

  return (
    <div
      role={didRetrySucceed ? "status" : "alert"}
      className="mt-4 rounded-xl border border-amber-400/50 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100"
    >
      <p>{didRetrySucceed ? <span>{successMessage}</span> : <span>{failureMessage}</span>}</p>
      {didRetrySucceed !== true && (
        <button
          type="button"
          onClick={() => void retry()}
          disabled={isRetrying}
          className="mt-2 rounded-md font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {isRetrying ? <span>{retryingLabel}</span> : <span>{retryLabel}</span>}
        </button>
      )}
    </div>
  );
};
