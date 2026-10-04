"use client";

import { useTranslations } from "next-intl";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const DeferredMapPowerContext = createContext(false);

interface DeferredMapProps {
  autoLoad?: boolean;
  children: ReactNode;
  className: string;
  label: string;
  loadImmediately?: boolean;
  showLoadAction?: boolean;
}

export const useDeferredMapPower = () => useContext(DeferredMapPowerContext);

const DeferredMap = ({
  autoLoad = true,
  children,
  className,
  label,
  loadImmediately = false,
  showLoadAction = true,
}: DeferredMapProps) => {
  const t = useTranslations("map");
  const containerRef = useRef<HTMLElement>(null);
  const [isLoadRequested, setIsLoadRequested] = useState(loadImmediately);
  const [isLowPower, setIsLowPower] = useState(false);

  useEffect(() => {
    if (loadImmediately || autoLoad === false || isLoadRequested) {
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
  }, [autoLoad, isLoadRequested, loadImmediately]);

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
                  ? "border-input theme-memory text-link"
                  : "border-input bg-control text-link",
              )}
            >
              <input
                type="checkbox"
                checked={isLowPower}
                onChange={(event) => setIsLowPower(event.target.checked)}
                className="h-4 w-4 rounded border-border text-icon focus:ring-2 focus:ring-ring"
              />
              {t("lowPowerMode")}
            </label>
          </div>
        </DeferredMapPowerContext.Provider>
      ) : (
        <div className="flex h-full min-h-80 w-full items-center justify-center rounded-[1.75rem] border border-dashed border-border bg-control p-6 text-center shadow-[0_16px_34px_rgba(var(--shadow-rgb),0.12)] dark:shadow-[0_20px_40px_rgba(var(--shadow-rgb),0.24)]">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="text-sm font-medium text-foreground">{t("deferredMapTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("deferredMapDescription")}</p>
            {showLoadAction === true && (
              <button
                type="button"
                className="rounded-full border border-input theme-action px-4 py-2 text-sm font-semibold text-action-foreground shadow-sm transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => setIsLoadRequested(true)}
              >
                {t("loadDeferredMap")}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export { DeferredMap };
