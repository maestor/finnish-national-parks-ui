"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { AdminVisibilityPark } from "@/lib/parks";
import { AdminParkMap } from "./admin-park-map";
import { ParkList } from "./park-list";

type ViewTab = "list" | "map";

interface ParkManagementProps {
  parks: AdminVisibilityPark[];
  removedParks: AdminVisibilityPark[];
}

export const ParkManagement = ({ parks, removedParks }: ParkManagementProps) => {
  const t = useTranslations("controlPanel.parks");
  const [activeView, setActiveView] = useState<ViewTab>("list");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>

      <div
        className="mt-6 inline-flex rounded-[1.2rem] border border-white/45 bg-white/56 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/42 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        role="tablist"
        aria-label={t("viewTabs.ariaLabel")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "list"}
          onClick={() => setActiveView("list")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeView === "list"
              ? "bg-white/86 text-foreground shadow-[0_10px_20px_rgba(148,163,184,0.16)] dark:bg-slate-950/68"
              : "text-muted-foreground hover:bg-white/62 hover:text-foreground dark:hover:bg-slate-950/56"
          }`}
        >
          {t("viewTabs.list")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "map"}
          onClick={() => setActiveView("map")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeView === "map"
              ? "bg-white/86 text-foreground shadow-[0_10px_20px_rgba(148,163,184,0.16)] dark:bg-slate-950/68"
              : "text-muted-foreground hover:bg-white/62 hover:text-foreground dark:hover:bg-slate-950/56"
          }`}
        >
          {t("viewTabs.map")}
        </button>
      </div>

      <div className="mt-4">
        {activeView === "list" ? (
          <ParkList parks={parks} removedParks={removedParks} />
        ) : (
          <div className="flex h-218.75 flex-col overflow-hidden rounded-[1.6rem] border border-white/45 bg-white/56 shadow-[0_18px_36px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/38 dark:shadow-[0_22px_40px_rgba(2,6,23,0.28)]">
            <AdminParkMap parks={parks} removedParks={removedParks} />
          </div>
        )}
      </div>
    </div>
  );
};
