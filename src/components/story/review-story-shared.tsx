import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { HeaderBrandMark } from "@/components/layout/header-brand-mark";
import {
  PUBLIC_HERO_DESCRIPTION_CLASS_NAME,
  PUBLIC_PANEL_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { cn } from "@/lib/cn";

export const REVIEW_STORY_COPY_CLASS_NAME =
  "max-w-3xl text-sm leading-6 text-primary-foreground/84 sm:text-base";

export const REVIEW_STORY_MICRO_BADGE_CLASS_NAME =
  "inline-flex items-center gap-2 rounded-full border border-white/26 bg-black/16 px-3 py-1 text-xs font-medium tracking-[0.16em] text-primary-foreground/78 uppercase backdrop-blur-sm";

export const REVIEW_STORY_ICON_SURFACE_CLASS_NAME =
  "inline-flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-white/24 bg-black/18 text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-sm";

export const REVIEW_STORY_PANEL_LINK_CLASS_NAME =
  "inline-flex text-xl font-semibold text-primary-foreground underline decoration-white/32 underline-offset-4 transition-colors hover:text-white";

export const getReviewStoryParkGridClassName = (count: number) => {
  if (count >= 3) {
    return "grid gap-4 md:grid-cols-2 xl:grid-cols-3";
  }

  if (count === 2) {
    return "grid gap-4 md:grid-cols-2";
  }

  return "grid gap-4";
};

interface ReviewStorySectionHeaderProps {
  badge: string;
  caption?: ReactNode;
  icon: ReactNode;
  title: ReactNode;
  titleClassName?: string;
}

export const ReviewStorySectionHeader = ({
  badge,
  caption,
  icon,
  title,
  titleClassName,
}: ReviewStorySectionHeaderProps) => (
  <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3">
      <div className={REVIEW_STORY_ICON_SURFACE_CLASS_NAME}>{icon}</div>
      <p className={REVIEW_STORY_MICRO_BADGE_CLASS_NAME}>{badge}</p>
    </div>
    <div className="space-y-3">
      <div
        className={cn(
          "text-3xl font-black tracking-tight text-primary-foreground sm:text-5xl",
          titleClassName,
        )}
      >
        {title}
      </div>
      {caption ? <div className={REVIEW_STORY_COPY_CLASS_NAME}>{caption}</div> : null}
    </div>
  </div>
);

interface ReviewStoryPlaceCardProps {
  className?: string;
  contentClassName?: string;
  dateText: ReactNode;
  extraContent?: ReactNode;
  href: string;
  image?: ReactNode;
  linkClassName?: string;
  name: string;
  style?: CSSProperties;
}

export const ReviewStoryPlaceCard = ({
  className,
  contentClassName,
  dateText,
  extraContent,
  href,
  image,
  linkClassName,
  name,
  style,
}: ReviewStoryPlaceCardProps) => (
  <article
    className={cn(
      "overflow-hidden rounded-3xl border border-white/24 bg-black/14 shadow-[0_24px_56px_rgba(15,23,42,0.2)]",
      "public-story-place-card",
      className,
    )}
    style={style}
  >
    {image}
    <div className={cn("space-y-3 p-5", contentClassName)}>
      <Link href={href} className={cn(REVIEW_STORY_PANEL_LINK_CLASS_NAME, linkClassName)}>
        {name}
      </Link>
      <p className="text-sm text-primary-foreground/82">{dateText}</p>
      {extraContent}
    </div>
  </article>
);

interface ReviewStoryFooterProps {
  browseAppLabel: string;
  footer: string;
  footerHint: string;
  footerIcon: ReactNode;
  mode: "preview" | "public";
  siteTitle: string;
}

export const ReviewStoryFooter = ({
  browseAppLabel,
  footer,
  footerHint,
  footerIcon,
  mode,
  siteTitle,
}: ReviewStoryFooterProps) => (
  <div className={cn(PUBLIC_PANEL_CLASS_NAME, "px-5 py-5")}>
    {mode === "public" ? (
      <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
        <Link
          href="/"
          className="inline-flex items-center gap-3 self-start rounded-full border border-white/45 bg-white/82 px-3 py-2 text-foreground shadow-[0_12px_28px_rgba(148,163,184,0.22)] backdrop-blur-md transition-colors hover:bg-white/94 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/56 dark:hover:bg-slate-950/76 dark:shadow-[0_16px_32px_rgba(2,6,23,0.38)] sm:justify-self-start"
        >
          <HeaderBrandMark className="h-10 w-10" />
          <span className="text-base font-semibold">{siteTitle}</span>
        </Link>
        <p className={cn(PUBLIC_HERO_DESCRIPTION_CLASS_NAME, "sm:text-center")}>
          {footerIcon}
          {footer}
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-border/60 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/45 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:justify-self-end"
        >
          {browseAppLabel}
        </Link>
      </div>
    ) : (
      <>
        <p className="text-sm text-muted-foreground">{footer}</p>
        <p className={`mt-2 ${PUBLIC_HERO_DESCRIPTION_CLASS_NAME}`}>
          {footerIcon}
          {footerHint}
        </p>
      </>
    )}
  </div>
);
