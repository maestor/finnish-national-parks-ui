"use client";

import { TentTree } from "lucide-react";
import Link from "next/link";
import { type MouseEventHandler, type ReactNode, useState } from "react";
import { PUBLIC_HERO_DESCRIPTION_CLASS_NAME } from "@/components/layout/public-page-styles";
import { AppImage } from "@/components/ui/app-image";
import {
  IMAGE_OVERLAY_LABEL_CLASS_NAME,
  MEMORY_SURFACE_CLASS_NAME,
} from "@/components/ui/theme-styles";
import type { PublicTripArchiveItem } from "@/lib/public-trips";

interface PublicMemoryCardProps {
  id: string;
  href: string;
  title: string;
  headingLevel: 2 | 3 | 4;
  featuredImage: PublicTripArchiveItem["featuredImage"];
  imageSizes?: string;
  ribbonLabel?: string;
  imageLoading?: "eager" | "lazy";
  descriptionExcerpt: string | null;
  descriptionPlaceholder: string;
  readMore: string;
  dateLabel: ReactNode;
  metadata: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export const PublicMemoryCard = ({
  id,
  href,
  title,
  headingLevel,
  featuredImage,
  imageLoading = "lazy",
  imageSizes = "(max-width: 767px) calc(100vw - 2rem), (max-width: 1023px) calc(50vw - 3rem), 480px",
  ribbonLabel,
  descriptionExcerpt,
  descriptionPlaceholder,
  readMore,
  dateLabel,
  metadata,
  onClick,
}: PublicMemoryCardProps) => {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const featuredImageUrl = featuredImage?.url;
  const shouldShowFeaturedImage = featuredImage !== null && featuredImageUrl !== failedImageUrl;
  const titleId = `${id}-title`;
  const readMoreHintId = `${id}-read-more`;
  const ribbonId = `${id}-ribbon`;
  const Heading = headingLevel === 4 ? "h4" : headingLevel === 3 ? "h3" : "h2";
  return (
    <Link
      href={href}
      title={readMore}
      prefetch={false}
      aria-labelledby={titleId}
      aria-describedby={ribbonLabel ? `${readMoreHintId} ${ribbonId}` : readMoreHintId}
      onClick={onClick}
      className="group block h-full w-full min-w-0 cursor-pointer rounded-[2rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <article
        aria-labelledby={titleId}
        className={`relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[2rem] ${MEMORY_SURFACE_CLASS_NAME} backdrop-blur-xl transition-[background-color,border-color,box-shadow,transform] duration-200 group-hover:-translate-y-1 group-hover:border-input group-hover:shadow-[0_28px_64px_rgba(var(--shadow-rgb),0.24)] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0`}
      >
        {!!ribbonLabel && (
          <span
            id={ribbonId}
            className="pointer-events-none absolute -right-12 top-9 z-20 w-56 rotate-45 bg-primary py-2 text-center text-xs font-semibold tracking-wide text-primary-foreground shadow-md"
          >
            {ribbonLabel}
          </span>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 rounded-[2rem] theme-memory transition-opacity duration-200 group-hover:opacity-0 motion-reduce:transition-none"
        />
        <div className="relative z-10 flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden bg-control">
          {shouldShowFeaturedImage ? (
            <AppImage
              src={featuredImage.url}
              alt=""
              fill
              loading={imageLoading}
              sizes={imageSizes}
              className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              onError={() => setFailedImageUrl(featuredImage.url)}
            />
          ) : (
            <TentTree className="h-12 w-12 text-link" aria-hidden="true" />
          )}
          <span
            className={`absolute left-4 top-4 z-10 max-w-[calc(100%-2rem)] rounded-full px-2.5 py-1 text-xs font-medium ${IMAGE_OVERLAY_LABEL_CLASS_NAME}`}
          >
            {dateLabel}
          </span>
        </div>

        <div className="relative z-10 flex min-w-0 flex-1 flex-col p-5 sm:p-6">
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
