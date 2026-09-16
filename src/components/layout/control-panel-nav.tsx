"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/cn";
import { appRoutes, normalizeAppPath } from "@/lib/routes";

const navLinkClassName =
  "rounded-[1.1rem] border border-white/40 bg-white/58 px-3 py-2 text-sm font-medium text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm transition-colors hover:bg-white/78 dark:border-white/10 dark:bg-slate-950/42 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:bg-slate-950/62";

const activeLinkClassName =
  "bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25";

export const ControlPanelNav = () => {
  const t = useTranslations("controlPanel");
  const auth = useAuth();
  const normalizedPathname = normalizeAppPath(usePathname());
  const router = useRouter();

  const links = [
    { href: appRoutes.controlPanel.root, label: t("dashboard.title") },
    { href: appRoutes.controlPanel.parks, label: t("parks.title") },
    { href: appRoutes.controlPanel.trips, label: t("trips.title") },
    { href: appRoutes.controlPanel.visits, label: t("visits.title") },
    { href: appRoutes.controlPanel.dateRangeReview, label: t("dateRangeReview.title") },
    { href: appRoutes.controlPanel.yearReview, label: t("yearReview.title") },
    ...(auth.user?.isSuperAdmin === true
      ? [{ href: appRoutes.controlPanel.admins, label: t("adminUsers.title") }]
      : []),
  ];

  const isCurrentLink = (href: string) =>
    normalizedPathname === href ||
    (href !== appRoutes.controlPanel.root && normalizedPathname.startsWith(`${href}/`));
  const currentLink = links.find(({ href }) => isCurrentLink(href)) ?? links[0];

  return (
    <nav className="flex flex-col gap-2" aria-label={t("title")}>
      <label className="sr-only" htmlFor="control-panel-section">
        {t("sectionLabel")}
      </label>
      <Select
        id="control-panel-section"
        value={currentLink.href}
        onChange={(event) => router.push(event.target.value)}
        wrapperClassName="md:hidden"
      >
        {links.map((link) => (
          <option key={link.href} value={link.href}>
            {link.label}
          </option>
        ))}
      </Select>
      <div className="hidden flex-col gap-2 md:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(navLinkClassName, isCurrentLink(link.href) && activeLinkClassName)}
            aria-current={isCurrentLink(link.href) ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};
