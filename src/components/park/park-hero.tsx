"use client";

import { type ReactNode, useState } from "react";
import { PUBLIC_PANEL_CLASS_NAME } from "@/components/layout/public-page-styles";
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
        "group/park-hero",
        PUBLIC_PANEL_CLASS_NAME,
        hasImage && "relative min-h-104 overflow-hidden sm:min-h-120",
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
          "@container relative w-full",
          hasImage && "rounded-2xl bg-hero/50 p-4 text-hero-foreground sm:p-6",
        )}
      >
        {children}
      </div>
    </section>
  );
};
