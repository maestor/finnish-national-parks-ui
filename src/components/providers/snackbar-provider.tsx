"use client";

import { CheckCircle2, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const SNACKBAR_DURATION_MS = 4500;

export type SnackbarTone = "success" | "error";

export interface SnackbarAction {
  href: string;
  label: string;
}

export interface SnackbarNotification {
  action?: SnackbarAction;
  durationMs?: number;
  message: string;
  tone: SnackbarTone;
}

interface ActiveSnackbar extends SnackbarNotification {
  id: number;
}

interface SnackbarContextValue {
  dismissSnackbar: () => void;
  showSnackbar: (notification: SnackbarNotification) => void;
}

const SnackbarContext = createContext<SnackbarContextValue>({
  dismissSnackbar: () => {},
  showSnackbar: () => {},
});

export const useSnackbar = () => useContext(SnackbarContext);

interface SnackbarProviderProps {
  children: React.ReactNode;
}

export const SnackbarProvider = ({ children }: SnackbarProviderProps) => {
  const t = useTranslations("layout.snackbar");
  const [activeSnackbar, setActiveSnackbar] = useState<ActiveSnackbar | null>(null);
  const nextSnackbarIdRef = useRef(0);

  const dismissSnackbar = useCallback(() => {
    setActiveSnackbar(null);
  }, []);

  const showSnackbar = useCallback((notification: SnackbarNotification) => {
    nextSnackbarIdRef.current += 1;
    setActiveSnackbar({
      ...notification,
      id: nextSnackbarIdRef.current,
    });
  }, []);

  useEffect(() => {
    if (activeSnackbar === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveSnackbar((current) => (current?.id === activeSnackbar.id ? null : current));
    }, activeSnackbar.durationMs ?? SNACKBAR_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [activeSnackbar]);

  const isError = activeSnackbar?.tone === "error";
  const Icon = isError ? XCircle : CheckCircle2;

  return (
    <SnackbarContext.Provider value={{ dismissSnackbar, showSnackbar }}>
      {children}
      {activeSnackbar !== null && (
        <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-start pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:left-4 sm:max-w-md">
          <div
            aria-atomic="true"
            className={cn(
              "pointer-events-auto flex w-full items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.22)] backdrop-blur-xl",
              isError
                ? "border-red-300/60 bg-red-50/95 text-red-950 dark:border-red-400/25 dark:bg-red-950/90 dark:text-red-100"
                : "border-emerald-300/60 bg-emerald-50/95 text-emerald-950 dark:border-emerald-400/25 dark:bg-emerald-950/90 dark:text-emerald-100",
            )}
            role={isError ? "alert" : "status"}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-medium leading-5">{activeSnackbar.message}</p>
              {activeSnackbar.action !== undefined && (
                <Link
                  href={activeSnackbar.action.href}
                  className="inline-flex text-sm font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {activeSnackbar.action.label}
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={dismissSnackbar}
              className="-mr-2 -mt-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </SnackbarContext.Provider>
  );
};
