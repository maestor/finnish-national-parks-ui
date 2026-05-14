"use client";

import { useAuth } from "@/hooks/use-auth";
import { env } from "@/lib/env";
import { MapPin, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHomeMapControls } from "../providers/home-map-controls-provider";
import { HomeParkSearch } from "./home-park-search";
import { ThemeToggle } from "./theme-toggle";

export const Header = () => {
  const t = useTranslations("layout");
  const auth = useAuth();
  const pathname = usePathname();
  const isControlPanel = pathname?.startsWith("/control-panel") ?? false;
  const isHomePage = pathname === "/";
  const { isMobileFiltersOpen, toggleMobileFilters } = useHomeMapControls();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center gap-3 px-4">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <MapPin className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="hidden font-bold sm:inline-block">{t("siteTitle")}</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center gap-3">
          {isHomePage && (
            <div className="flex items-center gap-2 md:flex-1">
              <HomeParkSearch />
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
            </div>
          )}
          <div className="ml-auto flex items-center space-x-2">
            {!auth.isLoading &&
              (auth.isAuthenticated ? (
                isControlPanel ? (
                  <button
                    type="button"
                    onClick={auth.logout}
                    className="cursor-pointer text-sm font-medium transition-colors hover:text-primary"
                  >
                    {t("nav.logout")}
                  </button>
                ) : (
                  <Link
                    href="/control-panel"
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    {t("nav.controlPanel")}
                  </Link>
                )
              ) : (
                <a
                  href={`${env.NEXT_PUBLIC_API_URL}/auth/google`}
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  {t("nav.login")}
                </a>
              ))}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};
