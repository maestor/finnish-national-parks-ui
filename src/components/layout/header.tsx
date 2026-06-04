"use client";

import { LoginLink } from "@/components/auth/login-link";
import { HeaderBrandMark } from "@/components/layout/header-brand-mark";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/cn";
import {
  Footprints,
  House,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react";
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
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/45 bg-white/76 text-foreground shadow-[0_10px_24px_rgba(148,163,184,0.2)] backdrop-blur-md transition-colors hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/44 dark:hover:bg-slate-950/64 dark:shadow-[0_16px_32px_rgba(2,6,23,0.34)]";
const MOBILE_SHEET_ITEM_CLASS =
  "flex w-full items-center gap-3 rounded-[1.35rem] border border-transparent px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-white/45 hover:bg-white/58 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:border-white/10 dark:hover:bg-slate-900/70";
const MOBILE_TOPBAR_ICON_BUTTON_CLASS =
  "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-white/82 text-foreground shadow-[0_12px_28px_rgba(148,163,184,0.22)] backdrop-blur-md transition-colors hover:bg-white/94 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/56 dark:hover:bg-slate-950/76 dark:shadow-[0_16px_32px_rgba(2,6,23,0.38)]";
const MOBILE_MENU_ANIMATION_MS = 180;
const HEADER_HIDE_SCROLL_THRESHOLD_PX = 96;
const HEADER_SCROLL_DELTA_THRESHOLD_PX = 12;

export const Header = () => {
  const t = useTranslations("layout");
  const auth = useAuth();
  const pathname = usePathname();
  const isControlPanel = pathname.startsWith("/control-panel");
  const isParksMapPage = pathname === "/parks";
  const isPublicVisitsPage = pathname === "/visits";
  const { isMobileFiltersOpen, toggleMobileFilters } = useHomeMapControls();
  const [isMobileMenuMounted, setIsMobileMenuMounted] = useState(false);
  const [isMobileMenuVisible, setIsMobileMenuVisible] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const openAnimationFrameRef = useRef<number | null>(null);
  const lastScrollYRef = useRef(0);

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

  useEffect(() => {
    void pathname;
    setIsHeaderVisible(true);
    lastScrollYRef.current = window.scrollY;
  }, [pathname]);

  useEffect(() => {
    if (isMobileMenuVisible) {
      setIsHeaderVisible(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      if (Math.abs(scrollDelta) < HEADER_SCROLL_DELTA_THRESHOLD_PX) {
        return;
      }

      const shouldShowHeader = currentScrollY <= HEADER_HIDE_SCROLL_THRESHOLD_PX || scrollDelta < 0;

      setIsHeaderVisible((current) => (current === shouldShowHeader ? current : shouldShowHeader));
      lastScrollYRef.current = currentScrollY;
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMobileMenuVisible]);

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
      {
        href: "/visits",
        label: t("nav.visits"),
        isCurrent: isPublicVisitsPage,
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
    [auth.isAuthenticated, isControlPanel, isPublicVisitsPage, pathname, t],
  );

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b border-border/70 bg-background/90 backdrop-blur transition-transform duration-300 ease-out motion-reduce:transition-none supports-[backdrop-filter]:bg-background/70",
          isHeaderVisible ? "translate-y-0" : "-translate-y-full",
        )}
      >
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
                className={cn(MOBILE_TOPBAR_ICON_BUTTON_CLASS, "md:hidden")}
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
              className={cn(MOBILE_TOPBAR_ICON_BUTTON_CLASS, "md:hidden")}
              aria-label={t("nav.menu")}
              aria-expanded={isMobileMenuVisible}
              aria-controls="mobile-header-menu"
            >
              <Menu className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
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
        <div className="fixed inset-0 z-50 flex items-start justify-end p-2 md:hidden">
          <button
            type="button"
            className={cn(
              "absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.26),rgba(15,23,42,0.5))] backdrop-blur-[2px] transition-opacity duration-180 ease-out motion-reduce:transition-none",
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
              "relative inset-auto m-0 flex h-[calc(100dvh-1rem)] w-[min(22rem,calc(100vw-1rem))] max-w-none flex-col gap-4 overflow-hidden rounded-[2rem] border border-white/45 bg-white/82 p-4 shadow-[0_32px_72px_rgba(148,163,184,0.3)] backdrop-blur-2xl transition-transform duration-180 ease-out motion-reduce:transition-none dark:border-white/10 dark:bg-slate-950/82 dark:shadow-[0_36px_76px_rgba(2,6,23,0.48)]",
              isMobileMenuVisible ? "translate-x-0" : "translate-x-full",
            )}
          >
            <div className="rounded-[1.6rem] border border-white/45 bg-[linear-gradient(118deg,rgba(22,101,52,0.14)_0%,rgba(15,118,110,0.1)_46%,rgba(37,99,235,0.16)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:border-white/10 dark:bg-[linear-gradient(118deg,rgba(22,101,52,0.22)_0%,rgba(15,118,110,0.18)_46%,rgba(37,99,235,0.24)_100%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <HeaderBrandMark className="h-10 w-10" />
                  <div className="min-w-0">
                    <p id="mobile-header-menu-title" className="truncate text-base font-semibold">
                      {t("nav.menu")}
                    </p>
                    <p className="truncate text-sm text-foreground/70 dark:text-sky-100/78">
                      {t("siteTitle")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className={MOBILE_TOPBAR_ICON_BUTTON_CLASS}
                  aria-label={t("nav.closeMenu")}
                >
                  <X className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-white/40 bg-white/56 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] dark:border-white/8 dark:bg-slate-950/44 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <nav className="flex flex-col gap-1">
                <Link href="/" className={MOBILE_SHEET_ITEM_CLASS} onClick={closeMobileMenu}>
                  <House className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{t("nav.home")}</span>
                </Link>
                <Link href="/parks" className={MOBILE_SHEET_ITEM_CLASS} onClick={closeMobileMenu}>
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{t("nav.map")}</span>
                </Link>
                <Link href="/visits" className={MOBILE_SHEET_ITEM_CLASS} onClick={closeMobileMenu}>
                  <Footprints className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{t("nav.visits")}</span>
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
            </div>

            <div className="rounded-[1.6rem] border border-white/40 bg-white/56 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] dark:border-white/8 dark:bg-slate-950/44 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
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
            </div>
          </dialog>
        </div>
      )}
    </>
  );
};
