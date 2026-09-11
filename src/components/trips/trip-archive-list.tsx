"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  createPublicTripArchivePath,
  type PublicTripArchiveItem,
  type PublicTripArchiveResponse,
} from "@/lib/public-trips";
import { TripArchiveCard } from "./trip-archive-card";

interface TripArchiveListProps {
  initialResponse: PublicTripArchiveResponse | null;
}

interface SavedArchiveState {
  batchCount: number;
  scrollY: number;
}

const ARCHIVE_STATE_KEY = "retket-archive-state";

const appendUniqueTrips = (current: PublicTripArchiveItem[], incoming: PublicTripArchiveItem[]) => {
  const existingIds = new Set(current.map((trip) => trip.id));
  return [...current, ...incoming.filter((trip) => !existingIds.has(trip.id))];
};

const readSavedArchiveState = (): SavedArchiveState | null => {
  try {
    const stored = sessionStorage.getItem(ARCHIVE_STATE_KEY);
    if (!stored) {
      return null;
    }

    sessionStorage.removeItem(ARCHIVE_STATE_KEY);
    const parsed = JSON.parse(stored) as Partial<SavedArchiveState>;
    const storedBatchCount = parsed.batchCount;
    const storedScrollY = parsed.scrollY;
    if (
      typeof storedBatchCount !== "number" ||
      !Number.isInteger(storedBatchCount) ||
      typeof storedScrollY !== "number" ||
      storedBatchCount < 2 ||
      storedScrollY < 0
    ) {
      return null;
    }

    return {
      batchCount: storedBatchCount,
      scrollY: storedScrollY,
    };
  } catch {
    return null;
  }
};

export const TripArchiveList = ({ initialResponse }: TripArchiveListProps) => {
  const t = useTranslations("tripsArchive");
  const [trips, setTrips] = useState<PublicTripArchiveItem[]>(initialResponse?.trips ?? []);
  const [nextCursor, setNextCursor] = useState<string | null>(initialResponse?.nextCursor ?? null);
  const [total, setTotal] = useState(initialResponse?.total ?? 0);
  const [status, setStatus] = useState<"error" | "idle" | "loading">(
    initialResponse === null ? "error" : "idle",
  );
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastAppendedCount, setLastAppendedCount] = useState(0);
  const [batchCount, setBatchCount] = useState(initialResponse === null ? 0 : 1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerArmedRef = useRef(true);
  const requestControllerRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef(0);
  const nextCursorRef = useRef(nextCursor);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  const requestBatch = useCallback(
    async (cursor: string | null, replace: boolean, automatic: boolean) => {
      if (status === "loading" || (automatic && status === "error")) {
        return false;
      }

      requestControllerRef.current?.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;
      const generation = requestGenerationRef.current;
      setStatus("loading");
      setLastAppendedCount(0);

      try {
        const response = await apiFetch<PublicTripArchiveResponse>(
          createPublicTripArchivePath(cursor),
          { signal: controller.signal },
        );
        if (controller.signal.aborted || generation !== requestGenerationRef.current) {
          return false;
        }

        setTrips((current) =>
          replace ? response.trips : appendUniqueTrips(current, response.trips),
        );
        setNextCursor(response.nextCursor);
        setTotal(response.total);
        setBatchCount((current) => (replace ? 1 : current + 1));
        setLastAppendedCount(response.trips.length);
        setStatus("idle");
        return true;
      } catch {
        if (controller.signal.aborted || generation !== requestGenerationRef.current) {
          return false;
        }

        setStatus("error");
        return false;
      } finally {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null;
        }
      }
    },
    [status],
  );

  const loadMore = useCallback(
    (automatic = false) => {
      const cursor = nextCursorRef.current;
      if (!cursor || status === "loading" || (automatic && status === "error")) {
        return;
      }

      observerArmedRef.current = false;
      void requestBatch(cursor, false, automatic);
    },
    [requestBatch, status],
  );

  const retryInitial = () => {
    observerArmedRef.current = false;
    void requestBatch(null, true, false);
  };

  useEffect(() => {
    if (!initialResponse || initialResponse.trips.length === 0) {
      return;
    }

    const savedState = readSavedArchiveState();
    if (!savedState || !nextCursorRef.current) {
      return;
    }

    let cancelled = false;
    const restoreController = new AbortController();
    const restore = async () => {
      setIsRestoring(true);
      let cursor = nextCursorRef.current;
      let restoredBatchCount = 1;

      while (!cancelled && cursor && restoredBatchCount < savedState.batchCount) {
        const response = await apiFetch<PublicTripArchiveResponse>(
          createPublicTripArchivePath(cursor),
          { signal: restoreController.signal },
        ).catch(() => null);
        if (!response) {
          break;
        }

        setTrips((current) => appendUniqueTrips(current, response.trips));
        setNextCursor(response.nextCursor);
        setTotal(response.total);
        cursor = response.nextCursor;
        restoredBatchCount += 1;
      }

      if (!cancelled) {
        setBatchCount(restoredBatchCount);
        setIsRestoring(false);
        window.requestAnimationFrame(() => window.scrollTo({ top: savedState.scrollY }));
      }
    };

    void restore();
    return () => {
      cancelled = true;
      restoreController.abort();
    };
  }, [initialResponse]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !nextCursor || status !== "idle" || isRestoring) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          observerArmedRef.current = true;
          return;
        }

        if (observerArmedRef.current) {
          observerArmedRef.current = false;
          loadMore(true);
        }
      },
      { rootMargin: "0px 0px 400px 0px" },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [isRestoring, loadMore, nextCursor, status]);

  useEffect(
    () => () => {
      requestGenerationRef.current += 1;
      requestControllerRef.current?.abort();
    },
    [],
  );

  const saveArchiveState = () => {
    if (batchCount < 2) {
      return;
    }

    try {
      sessionStorage.setItem(
        ARCHIVE_STATE_KEY,
        JSON.stringify({ batchCount, scrollY: window.scrollY }),
      );
    } catch {
      // Session storage is an enhancement for browser Back, not a requirement for browsing.
    }
  };

  const isEmpty = status !== "error" && trips.length === 0;
  const hasMoreTrips = nextCursor !== null;
  const shouldRenderControls =
    hasMoreTrips || status === "loading" || (status === "error" && trips.length > 0);

  if (status === "error" && trips.length === 0) {
    return (
      <div className="space-y-4" role="alert">
        <p>{t("loadFailed")}</p>
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={retryInitial}
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="sr-only" aria-live="polite">
        {t("loadedCount", { count: trips.length, total })}
      </p>

      {isEmpty === true && <p className="text-sm text-muted-foreground">{t("empty")}</p>}

      {trips.length > 0 && (
        <ul
          aria-busy={status === "loading" || isRestoring}
          aria-label={t("listLabel")}
          className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2"
        >
          {trips.map((trip) => (
            <TripArchiveCard key={trip.id} trip={trip} onDetailNavigate={saveArchiveState} />
          ))}
        </ul>
      )}

      {hasMoreTrips && <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />}

      {!hasMoreTrips && trips.length > 0 && status !== "loading" && !isRestoring && (
        <p className="sr-only" role="status">
          {t("allShown")}
        </p>
      )}
      {lastAppendedCount > 0 && status === "idle" && (
        <span className="sr-only" aria-live="polite">
          {t("appendedCount", { count: lastAppendedCount })}
        </span>
      )}

      {shouldRenderControls === true && (
        <div className="flex min-h-11 flex-wrap items-center gap-3">
          {status === "loading" && (
            <p role="status" className="text-sm text-muted-foreground">
              {t("loadingMore")}
            </p>
          )}
          {status === "error" && trips.length > 0 && (
            <div role="alert" className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-destructive">{t("loadMoreFailed")}</p>
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => loadMore(false)}
              >
                {t("retry")}
              </button>
            </div>
          )}
          {hasMoreTrips && status !== "error" && (
            <button
              type="button"
              disabled={status === "loading"}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => loadMore(false)}
            >
              {t("loadMore")}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
