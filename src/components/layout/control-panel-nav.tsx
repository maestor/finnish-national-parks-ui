"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { appRoutes, normalizeAppPath } from "@/lib/routes";

const navLinkClassName =
  "rounded-[1.1rem] border border-white/40 bg-white/58 px-3 py-2 text-sm font-medium text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm transition-colors hover:bg-white/78 dark:border-white/10 dark:bg-slate-950/42 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:bg-slate-950/62";

const activeLinkClassName =
  "bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25";

export const ControlPanelNav = () => {
  const t = useTranslations("controlPanel");
  const normalizedPathname = normalizeAppPath(usePathname());

  const links = [
    { href: appRoutes.controlPanel.root, label: t("dashboard.title") },
    { href: appRoutes.controlPanel.parks, label: t("parks.title") },
    { href: appRoutes.controlPanel.trips, label: t("trips.title") },
    { href: appRoutes.controlPanel.visits, label: t("visits.title") },
  ];

  return (
    <nav className="flex flex-col gap-2" aria-label={t("title")}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(navLinkClassName, normalizedPathname === link.href && activeLinkClassName)}
          aria-current={normalizedPathname === link.href ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
};
