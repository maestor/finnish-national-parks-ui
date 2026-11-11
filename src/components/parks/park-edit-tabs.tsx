"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, type ReactNode, useRef, useState } from "react";

type Tab = "details" | "trails";

export const ParkEditTabs = ({ details, trails }: { details: ReactNode; trails: ReactNode }) => {
  const t = useTranslations("controlPanel.parks.edit.tabs");
  const [active, setActive] = useState<Tab>("details");
  const detailsRef = useRef<HTMLButtonElement>(null);
  const trailsRef = useRef<HTMLButtonElement>(null);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "details"
        : event.key === "End"
          ? "trails"
          : active === "details"
            ? "trails"
            : "details";
    setActive(next);
    (next === "details" ? detailsRef : trailsRef).current?.focus();
  };
  return (
    <div className="mt-6">
      <div
        role="tablist"
        aria-label={t("label")}
        onKeyDown={onKeyDown}
        className="inline-flex rounded-xl border border-border bg-control p-1"
      >
        {(["details", "trails"] as const).map((tab) => (
          <button
            key={tab}
            ref={tab === "details" ? detailsRef : trailsRef}
            type="button"
            role="tab"
            id={`park-edit-tab-${tab}`}
            aria-controls={`park-edit-panel-${tab}`}
            aria-selected={active === tab}
            tabIndex={active === tab ? 0 : -1}
            onClick={() => setActive(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${active === tab ? "theme-memory text-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            {t(tab)}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="park-edit-panel-details"
        aria-labelledby="park-edit-tab-details"
        hidden={active !== "details"}
      >
        {details}
      </div>
      <div
        role="tabpanel"
        id="park-edit-panel-trails"
        aria-labelledby="park-edit-tab-trails"
        hidden={active !== "trails"}
      >
        {trails}
      </div>
    </div>
  );
};
