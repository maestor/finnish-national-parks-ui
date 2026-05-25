"use client";

import { LoginLink } from "@/components/auth/login-link";
import { HeaderBrandMark } from "@/components/layout/header-brand-mark";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/cn";
import { House, LogIn, LogOut, MapPin, Menu, Settings, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHomeMapControls } from "../providers/home-map-controls-provider";
import { HomeParkSearch } from "./home-park-search";
import { ThemeToggle } from "./theme-toggle";

const DESKTOP_NAV_LINK_CLASS =
  "inline-flex items-center rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const DESKTOP_ACTIVE_NAV_LINK_CLASS = "bg-white/75 text-foreground shadow-sm dark:bg-slate-950/45";
const DESKTOP_ICON_BUTTON_CLASS =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const MOBILE_SHEET_ITEM_CLASS =
  "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const MOBILE_MENU_ANIMATION_MS = 180;

export const Header = () => {
  const t = useTranslations("layout");
  const auth = useAuth();
  const pathname = usePathname();
  const isControlPanel = pathname.startsWith("/control-panel");
  const isParksMapPage = pathname === "/parks";
  const { isMobileFiltersOpen, toggleMobileFilters } = useHomeMapControls();
  const [isMobileMenuMounted, setIsMobileMenuMounted] = useState(false);
  const [isMobileMenuVisible, setIsMobileMenuVisible] = useState(false);
  const openAnimationFrameRef = useRef<number | null>(null);

  const openMobileMenu = () => {
    if (openAnimationFrameRef.current !== null) {
      cancelAnimationFrame(openAnimationFrameRef.current);
      openAnimationFrameRef.current = null;
    }

    setIsMobileMenuMounted(true);
    openAnimationFrameRef.current = requestAnimationFrame(() => {
      setIsMobileMenuVisible(true);
      openAnimationFrameRef.current = null;
    });
  };

  const closeMobileMenu = useCallback(() => {
    if (openAnimationFrameRef.current !== null) {
      cancelAnimationFrame(openAnimationFrameRef.current);
      openAnimationFrameRef.current = null;
    }

    setIsMobileMenuVisible(false);
  }, []);

  useEffect(() => {
    if (!isMobileMenuMounted) {
      return;
    }

    if (isMobileMenuVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsMobileMenuMounted(false);
    }, MOBILE_MENU_ANIMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isMobileMenuMounted, isMobileMenuVisible]);

  useEffect(() => {
    if (!isMobileMenuVisible) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeMobileMenu, isMobileMenuVisible]);

  useEffect(() => {
    return () => {
      if (openAnimationFrameRef.current !== null) {
        cancelAnimationFrame(openAnimationFrameRef.current);
      }
    };
  }, []);

  const desktopNavItems = useMemo(
    () => [
      {
        href: "/",
        label: t("nav.home"),
        isCurrent: pathname === "/",
      },
      {
        href: "/parks",
        label: t("nav.map"),
        isCurrent: pathname === "/parks",
      },
      ...(auth.isAuthenticated
        ? [
            {
              href: "/control-panel",
              label: t("nav.controlPanel"),
              isCurrent: isControlPanel,
            },
          ]
        : []),
    ],
    [auth.isAuthenticated, isControlPanel, pathname, t],
  );

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(22,101,52,0.16)_0%,rgba(15,118,110,0.12)_46%,rgba(37,99,235,0.18)_100%)] dark:bg-[linear-gradient(118deg,rgba(22,101,52,0.28)_0%,rgba(15,118,110,0.24)_46%,rgba(37,99,235,0.3)_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_32%)]"
        />
        <div className="relative container mx-auto flex h-14 items-center gap-2 px-4 md:gap-3">
          <Link
            href="/parks"
            className="flex min-w-0 items-center gap-3 rounded-full border border-white/35 bg-white/70 py-1 pl-2 pr-3 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-white/85 dark:border-white/10 dark:bg-slate-950/30 dark:hover:bg-slate-950/45"
          >
            <HeaderBrandMark testId="header-brand-mark" />
            <span className="truncate font-bold tracking-tight">{t("siteTitle")}</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {desktopNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.isCurrent ? "page" : undefined}
                className={cn(
                  DESKTOP_NAV_LINK_CLASS,
                  item.isCurrent && DESKTOP_ACTIVE_NAV_LINK_CLASS,
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <div className="min-w-0 md:flex-1 md:max-w-md">
              <HomeParkSearch />
            </div>
            {isParksMapPage && (
              <button
                type="button"
                onClick={toggleMobileFilters}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
                aria-label={t("nav.filters")}
                aria-expanded={isMobileFiltersOpen}
                aria-controls="park-map-filters-mobile"
              >
                {isMobileFiltersOpen ? (
                  <X className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={openMobileMenu}
              className={cn(DESKTOP_ICON_BUTTON_CLASS, "md:hidden")}
              aria-label={t("nav.menu")}
              aria-expanded={isMobileMenuVisible}
              aria-controls="mobile-header-menu"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="hidden items-center gap-2 md:flex">
              <ThemeToggle className={DESKTOP_ICON_BUTTON_CLASS} />
              {!auth.isLoading &&
                (auth.isAuthenticated ? (
                  <button
                    type="button"
                    onClick={auth.logout}
                    className={cn(DESKTOP_ICON_BUTTON_CLASS, "cursor-pointer")}
                    aria-label={t("nav.logout")}
                    title={t("nav.logout")}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <LoginLink
                    className={DESKTOP_ICON_BUTTON_CLASS}
                    ariaLabel={t("nav.login")}
                    title={t("nav.login")}
                  >
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                  </LoginLink>
                ))}
            </div>
          </div>
        </div>
      </header>

      {isMobileMenuMounted && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          <button
            type="button"
            className={cn(
              "absolute inset-0 bg-black/45 transition-opacity duration-180 ease-out motion-reduce:transition-none",
              isMobileMenuVisible ? "opacity-100" : "opacity-0",
            )}
            onClick={closeMobileMenu}
            aria-label={t("nav.closeMenu")}
          />
          <dialog
            open
            id="mobile-header-menu"
            aria-modal="true"
            aria-labelledby="mobile-header-menu-title"
            className={cn(
              "relative inset-auto m-0 h-full w-[min(20rem,calc(100vw-1rem))] max-w-none flex-col border-l border-border bg-background p-4 shadow-2xl transition-transform duration-180 ease-out motion-reduce:transition-none",
              isMobileMenuVisible ? "translate-x-0" : "translate-x-full",
            )}
          >
            <div className="flex items-center justify-between">
              <h2 id="mobile-header-menu-title" className="text-base font-semibold">
                {t("nav.menu")}
              </h2>
              <button
                type="button"
                onClick={closeMobileMenu}
                className={DESKTOP_ICON_BUTTON_CLASS}
                aria-label={t("nav.closeMenu")}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <nav className="mt-4 flex flex-col gap-1">
              <Link href="/" className={MOBILE_SHEET_ITEM_CLASS} onClick={closeMobileMenu}>
                <House className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t("nav.home")}</span>
              </Link>
              <Link href="/parks" className={MOBILE_SHEET_ITEM_CLASS} onClick={closeMobileMenu}>
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t("nav.map")}</span>
              </Link>
              {auth.isAuthenticated && (
                <Link
                  href="/control-panel"
                  className={MOBILE_SHEET_ITEM_CLASS}
                  onClick={closeMobileMenu}
                >
                  <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{t("nav.controlPanel")}</span>
                </Link>
              )}
            </nav>

            <div className="my-4 border-t border-border" />

            <div className="flex flex-col gap-1">
              <ThemeToggle
                showLabel
                className={MOBILE_SHEET_ITEM_CLASS}
                onToggle={closeMobileMenu}
              />
              {!auth.isLoading &&
                (auth.isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      auth.logout();
                    }}
                    className={MOBILE_SHEET_ITEM_CLASS}
                  >
                    <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{t("nav.logout")}</span>
                  </button>
                ) : (
                  <LoginLink className={MOBILE_SHEET_ITEM_CLASS} onClick={closeMobileMenu}>
                    <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{t("nav.login")}</span>
                  </LoginLink>
                ))}
            </div>
          </dialog>
        </div>
      )}
    </>
  );
};
