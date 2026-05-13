"use client";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export const Header = () => {
  const t = useTranslations("layout");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 px-4 items-center mx-auto">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <MapPin className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="hidden font-bold sm:inline-block">{t("siteTitle")}</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
