import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
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
