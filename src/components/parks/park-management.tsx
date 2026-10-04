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
        className="mt-6 inline-flex rounded-[1.2rem] border border-border bg-control p-1 shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.4)] backdrop-blur-sm dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]"
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
              ? "theme-memory text-foreground shadow-[0_10px_20px_rgba(var(--shadow-rgb),0.16)]"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
              ? "theme-memory text-foreground shadow-[0_10px_20px_rgba(var(--shadow-rgb),0.16)]"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {t("viewTabs.map")}
        </button>
      </div>

      <div className="mt-4">
        {activeView === "list" ? (
          <ParkList parks={parks} removedParks={removedParks} />
        ) : (
          <div className="flex h-218.75 flex-col overflow-hidden rounded-[1.6rem] border border-border bg-control shadow-[0_18px_36px_rgba(var(--shadow-rgb),0.14)] backdrop-blur-xl dark:shadow-[0_22px_40px_rgba(var(--shadow-rgb),0.28)]">
            <AdminParkMap parks={parks} removedParks={removedParks} />
          </div>
        )}
      </div>
    </div>
  );
};
