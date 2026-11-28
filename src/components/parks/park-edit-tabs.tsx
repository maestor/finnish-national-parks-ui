"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, type ReactNode, useRef, useState } from "react";

const tabOrder = ["details", "areas", "trails"] as const;
type Tab = (typeof tabOrder)[number];

export const ParkEditTabs = ({
  details,
  areas,
  trails,
}: {
  details: ReactNode;
  areas?: ReactNode;
  trails: ReactNode;
}) => {
  const t = useTranslations("controlPanel.parks.edit.tabs");
  const [active, setActive] = useState<Tab>("details");
  const refs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const panels = { details, areas, trails };
  const tabs = tabOrder.filter((tab) => panels[tab] !== undefined);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = tabs.indexOf(active);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    const next = tabs[nextIndex];
    setActive(next);
    refs.current[next]?.focus();
  };
  return (
    <div className="mt-6">
      <div
        role="tablist"
        aria-label={t("label")}
        onKeyDown={onKeyDown}
        className="inline-flex rounded-xl border border-border bg-control p-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            ref={(node) => {
              refs.current[tab] = node;
            }}
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
      {tabs.map((tab) => (
        <div
          key={tab}
          role="tabpanel"
          id={`park-edit-panel-${tab}`}
          aria-labelledby={`park-edit-tab-${tab}`}
          hidden={active !== tab}
        >
          {panels[tab]}
        </div>
      ))}
    </div>
  );
};
