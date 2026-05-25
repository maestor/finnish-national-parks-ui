"use client";

import { cn } from "@/lib/cn";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  className?: string;
  onToggle?: () => void;
  showLabel?: boolean;
  title?: string;
}

export const ThemeToggle = ({
  className,
  onToggle,
  showLabel = false,
  title,
}: ThemeToggleProps) => {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const t = useTranslations("layout.themeToggle");
  const [isMounted, setIsMounted] = useState(false);
  const currentTheme = isMounted ? (resolvedTheme ?? theme) : null;
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  const actionLabel = nextTheme === "dark" ? t("dark") : t("light");
  const modeLabel = nextTheme === "dark" ? t("darkMode") : t("lightMode");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        setTheme(nextTheme);
        onToggle?.();
      }}
      className={cn(
        showLabel
          ? "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : "relative inline-flex cursor-pointer items-center justify-center rounded-full border border-border bg-background/90 p-2 text-sm font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label={showLabel ? undefined : t("srLabel")}
      title={title ?? (!showLabel ? (isMounted ? actionLabel : t("srLabel")) : undefined)}
    >
      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <Sun
          className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
          aria-hidden="true"
        />
        <Moon
          className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
          aria-hidden="true"
        />
      </span>
      {showLabel ? (
        <span>{isMounted ? modeLabel : t("srLabel")}</span>
      ) : (
        <span className="sr-only">{t("srLabel")}</span>
      )}
    </button>
  );
};
