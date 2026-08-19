"use client";

import { useTranslations } from "next-intl";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const DeferredMapPowerContext = createContext(false);

interface DeferredMapProps {
  children: ReactNode;
  className: string;
  label: string;
}

export const useDeferredMapPower = () => useContext(DeferredMapPowerContext);

const DeferredMap = ({ children, className, label }: DeferredMapProps) => {
  const t = useTranslations("map");
  const containerRef = useRef<HTMLElement>(null);
  const [isLoadRequested, setIsLoadRequested] = useState(false);
  const [isLowPower, setIsLowPower] = useState(false);

  useEffect(() => {
    if (isLoadRequested) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setIsLoadRequested(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsLoadRequested(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(container);

    return () => observer.disconnect();
  }, [isLoadRequested]);

  return (
    <section ref={containerRef} className={cn("relative", className)} aria-label={label}>
      {isLoadRequested ? (
        <DeferredMapPowerContext.Provider value={isLowPower}>
          {children}
          <div className="pointer-events-none absolute top-3 left-3 z-10">
            <label
              className={cn(
                "pointer-events-auto flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-lg",
                isLowPower
                  ? "border-emerald-300/70 bg-emerald-50 text-emerald-950 dark:border-emerald-300/20 dark:bg-emerald-950/80 dark:text-emerald-100"
                  : "border-white/60 bg-white/90 text-slate-800 dark:border-white/15 dark:bg-slate-950/90 dark:text-slate-100",
              )}
            >
              <input
                type="checkbox"
                checked={isLowPower}
                onChange={(event) => setIsLowPower(event.target.checked)}
                className="h-4 w-4 rounded border-slate-400 text-emerald-600 focus:ring-2 focus:ring-ring"
              />
              {t("lowPowerMode")}
            </label>
          </div>
        </DeferredMapPowerContext.Provider>
      ) : (
        <div className="flex h-full min-h-80 w-full items-center justify-center rounded-[1.75rem] border border-dashed border-sky-200/80 bg-white/70 p-6 text-center shadow-[0_16px_34px_rgba(148,163,184,0.12)] dark:border-white/15 dark:bg-slate-950/65 dark:shadow-[0_20px_40px_rgba(2,6,23,0.24)]">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="text-sm font-medium text-foreground">{t("deferredMapTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("deferredMapDescription")}</p>
            <button
              type="button"
              className="rounded-full border border-emerald-200/70 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => setIsLoadRequested(true)}
            >
              {t("loadDeferredMap")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export { DeferredMap };
