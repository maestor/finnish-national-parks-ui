"use client";

import { TentTree } from "lucide-react";
import Link from "next/link";
import { type MouseEventHandler, type ReactNode, useState } from "react";
import { PUBLIC_HERO_DESCRIPTION_CLASS_NAME } from "@/components/layout/public-page-styles";
import { AppImage } from "@/components/ui/app-image";
import type { PublicTripArchiveItem } from "@/lib/public-trips";

interface PublicMemoryCardProps {
  id: string;
  href: string;
  title: string;
  headingLevel: 2 | 4;
  featuredImage: PublicTripArchiveItem["featuredImage"];
  descriptionExcerpt: string | null;
  descriptionPlaceholder: string;
  readMore: string;
  metadata: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export const PublicMemoryCard = ({
  id,
  href,
  title,
  headingLevel,
  featuredImage,
  descriptionExcerpt,
  descriptionPlaceholder,
  readMore,
  metadata,
  onClick,
}: PublicMemoryCardProps) => {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const featuredImageUrl = featuredImage?.url;
  const shouldShowFeaturedImage = featuredImage !== null && featuredImageUrl !== failedImageUrl;
  const titleId = `${id}-title`;
  const readMoreHintId = `${id}-read-more`;
  const Heading = headingLevel === 4 ? "h4" : "h2";
  return (
    <Link
      href={href}
      prefetch={false}
      aria-labelledby={titleId}
      aria-describedby={readMoreHintId}
      onClick={onClick}
      className="group block h-full w-full min-w-0 cursor-pointer rounded-[2rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <article
        aria-labelledby={titleId}
        className="relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[2rem] border border-white/45 bg-white/68 p-5 shadow-[0_22px_52px_rgba(37,99,235,0.14)] backdrop-blur-xl transition-[background-color,border-color,box-shadow,transform] duration-200 group-hover:-translate-y-1 group-hover:border-primary/45 group-hover:bg-white/82 group-hover:shadow-[0_28px_64px_rgba(37,99,235,0.24)] dark:border-white/10 dark:bg-slate-950/44 sm:p-6 dark:shadow-[0_28px_60px_rgba(2,6,23,0.34)] dark:group-hover:border-emerald-300/30 dark:group-hover:bg-slate-950/58 dark:group-hover:shadow-[0_34px_72px_rgba(2,6,23,0.5)] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 rounded-[2rem] bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(219,234,254,0.62),rgba(220,252,231,0.68))] transition-opacity duration-200 group-hover:opacity-0 dark:bg-[linear-gradient(145deg,rgba(2,6,23,0.72),rgba(15,23,42,0.84),rgba(6,78,59,0.34))] motion-reduce:transition-none"
        />
        <div
          className="relative z-10 flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden bg-slate-200/65 dark:bg-slate-900/70"
          aria-hidden="true"
        >
          {shouldShowFeaturedImage ? (
            <AppImage
              src={featuredImage.url}
              alt=""
              fill
              sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1023px) calc(50vw - 3rem), 480px"
              className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              onError={() => setFailedImageUrl(featuredImage.url)}
            />
          ) : (
            <TentTree className="h-12 w-12 text-primary" />
          )}
        </div>

        <div className="relative z-10 flex min-w-0 flex-1 flex-col p-0 pt-4">
          <Heading id={titleId} className="break-words text-xl font-semibold tracking-tight">
            {title}
          </Heading>

          {metadata}

          <p
            className={`mt-4 line-clamp-3 ${PUBLIC_HERO_DESCRIPTION_CLASS_NAME} ${descriptionExcerpt === null ? "italic" : ""}`}
          >
            {descriptionExcerpt ?? descriptionPlaceholder}
          </p>
        </div>
      </article>
      <span id={readMoreHintId} className="sr-only">
        {readMore}
      </span>
    </Link>
  );
};
