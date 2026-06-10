"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import type { AdminParkVisibilityResponse } from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ParkVisibilityState = "visible" | "hidden" | null;

interface ParkAdminControlsContextValue {
  actionError: string | null;
  isAuthenticated: boolean;
  isPending: boolean;
  isVisibilityLoading: boolean;
  parkSlug: string;
  toggleVisibility: () => Promise<void>;
  visibility: ParkVisibilityState;
}

const ParkAdminControlsContext = createContext<ParkAdminControlsContextValue | null>(null);

interface ParkAdminControlsProviderProps extends PropsWithChildren {
  parkSlug: string;
}

const getVisibilityForSlug = (
  parkSlug: string,
  visibilityResponse: AdminParkVisibilityResponse,
): ParkVisibilityState => {
  if (visibilityResponse.visibleParks.some((park) => park.slug === parkSlug)) {
    return "visible";
  }

  if (visibilityResponse.removedParks.some((park) => park.slug === parkSlug)) {
    return "hidden";
  }

  return null;
};

const useParkAdminControls = () => {
  const context = useContext(ParkAdminControlsContext);

  if (context === null) {
    throw new Error("Park admin controls must be used inside ParkAdminControlsProvider");
  }

  return context;
};

export const ParkAdminControlsProvider = ({
  children,
  parkSlug,
}: ParkAdminControlsProviderProps) => {
  const auth = useAuth();
  const [visibility, setVisibility] = useState<ParkVisibilityState>(null);
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    if (!auth.isAuthenticated) {
      setVisibility(null);
      setIsVisibilityLoading(false);
      setIsPending(false);
      setActionError(null);
      return;
    }

    let cancelled = false;
    setIsVisibilityLoading(true);
    setActionError(null);

    apiFetch<AdminParkVisibilityResponse>("/api/admin/parks/visibility")
      .then((response) => {
        if (!cancelled) {
          setVisibility(getVisibilityForSlug(parkSlug, response));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setActionError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsVisibilityLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, auth.isLoading, parkSlug]);

  const toggleVisibility = useCallback(async () => {
    if (visibility === null) {
      return;
    }

    const nextVisibility = visibility === "visible" ? "hidden" : "visible";
    setIsPending(true);
    setActionError(null);

    try {
      await apiFetch(`/api/parks/${parkSlug}/removed`, {
        method: "PATCH",
        body: JSON.stringify({ removed: nextVisibility === "hidden" }),
      });
      await revalidatePublicCache({ parkSlug });
      setVisibility(nextVisibility);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsPending(false);
    }
  }, [parkSlug, visibility]);

  const value = useMemo<ParkAdminControlsContextValue>(
    () => ({
      actionError,
      isAuthenticated: auth.isAuthenticated,
      isPending,
      isVisibilityLoading,
      parkSlug,
      toggleVisibility,
      visibility,
    }),
    [
      actionError,
      auth.isAuthenticated,
      isPending,
      isVisibilityLoading,
      parkSlug,
      toggleVisibility,
      visibility,
    ],
  );

  return (
    <ParkAdminControlsContext.Provider value={value}>{children}</ParkAdminControlsContext.Provider>
  );
};

export const ParkVisibilityBadge = () => {
  const t = useTranslations("park.admin");
  const { isAuthenticated, isVisibilityLoading, visibility } = useParkAdminControls();

  if (!isAuthenticated || isVisibilityLoading || visibility === null) {
    return null;
  }

  const isVisible = visibility === "visible";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm leading-none font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] ${
        isVisible
          ? "border-emerald-200/60 bg-[linear-gradient(145deg,rgba(22,101,52,0.12),rgba(16,185,129,0.14))] text-emerald-900 dark:border-emerald-300/15 dark:bg-[linear-gradient(145deg,rgba(22,101,52,0.22),rgba(5,150,105,0.18))] dark:text-emerald-100"
          : "border-amber-200/60 bg-[linear-gradient(145deg,rgba(245,158,11,0.14),rgba(180,83,9,0.08))] text-amber-950 dark:border-amber-300/18 dark:bg-[linear-gradient(145deg,rgba(180,83,9,0.2),rgba(120,53,15,0.18))] dark:text-amber-100"
      }`}
    >
      {isVisible ? t("visibleBadge") : t("hiddenBadge")}
    </span>
  );
};

export const ParkAdminSection = () => {
  const t = useTranslations("park.admin");
  const {
    actionError,
    isAuthenticated,
    isPending,
    isVisibilityLoading,
    parkSlug,
    toggleVisibility,
    visibility,
  } = useParkAdminControls();

  if (!isAuthenticated || isVisibilityLoading || visibility === null) {
    return null;
  }

  const isVisible = visibility === "visible";

  return (
    <section className="mt-8 rounded-[2rem] border border-white/45 bg-white/60 p-5 shadow-[0_24px_48px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/42 dark:shadow-[0_28px_56px_rgba(2,6,23,0.3)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <ParkVisibilityBadge />
      </div>

      {actionError && (
        <p
          role="alert"
          className="mt-4 rounded-[1.3rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          {actionError}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={isVisible ? "destructive" : "outline"}
          onClick={toggleVisibility}
          disabled={isPending}
        >
          {isPending ? t("updating") : isVisible ? t("hideAction") : t("showAction")}
        </Button>
        <Link
          href={`/control-panel/parks/${parkSlug}/edit`}
          className="inline-flex h-10 items-center justify-center rounded-md border border-white/45 bg-white/78 px-4 py-2 text-sm font-medium text-foreground shadow-[0_10px_24px_rgba(148,163,184,0.18)] backdrop-blur-md transition-colors hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/58 dark:hover:bg-slate-950/74 dark:shadow-[0_16px_32px_rgba(2,6,23,0.28)]"
        >
          {t("editAction")}
        </Link>
      </div>
    </section>
  );
};
