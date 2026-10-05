"use client";

import { type ReactNode, useState } from "react";
import { AppImage } from "@/components/ui/app-image";
import { cn } from "@/lib/cn";

interface ParkHeroProps {
  children: ReactNode;
  featuredImage: { fullUrl: string } | null;
  privateMedia?: boolean;
}

export const ParkHero = ({ children, featuredImage, privateMedia = false }: ParkHeroProps) => {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const hasImage = featuredImage !== null && featuredImage.fullUrl !== failedImageUrl;
  return (
    <section
      className={cn(
        "group/park-hero rounded-[2rem] border border-border theme-panel px-6 py-6 shadow-[0_24px_48px_rgba(var(--shadow-rgb),0.16)] backdrop-blur-xl dark:shadow-[0_28px_56px_rgba(var(--shadow-rgb),0.34)]",
        hasImage && "relative flex min-h-104 items-center overflow-hidden sm:min-h-120",
      )}
      data-featured-image={hasImage ? "true" : undefined}
    >
      {hasImage && featuredImage !== null && (
        <AppImage
          src={featuredImage.fullUrl}
          alt=""
          fill
          sizes="(max-width: 1024px) calc(100vw - 2rem), 1024px"
          className="object-cover object-center"
          loading="eager"
          priority
          privateMedia={privateMedia}
          onError={() => setFailedImageUrl(featuredImage.fullUrl)}
        />
      )}
      {hasImage === true && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-hero/55 via-hero/15 to-hero/10"
        />
      )}
      <div
        className={cn(
          "relative w-full",
          hasImage && "rounded-2xl bg-hero/65 p-4 text-hero-foreground sm:p-6",
        )}
      >
        {children}
      </div>
    </section>
  );
};
