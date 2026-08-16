import type { Metadata } from "next";

interface BuildPageMetadataOptions {
  description?: string;
  socialImagePath?: string;
}

export const buildShareTitle = (pageTitle: string, siteTitle: string) =>
  `${pageTitle} | ${siteTitle}`;

export const buildPageMetadata = (
  pageTitle: string,
  siteTitle: string,
  options?: BuildPageMetadataOptions,
): Metadata => {
  const shareTitle = buildShareTitle(pageTitle, siteTitle);
  const description = options?.description;
  const socialImagePath = options?.socialImagePath;

  return {
    title: pageTitle,
    ...(description ? { description } : {}),
    openGraph: {
      title: shareTitle,
      ...(description ? { description } : {}),
      ...(socialImagePath ? { images: [socialImagePath] } : {}),
    },
    twitter: {
      ...(socialImagePath ? { card: "summary_large_image" as const } : {}),
      title: shareTitle,
      ...(description ? { description } : {}),
      ...(socialImagePath ? { images: [socialImagePath] } : {}),
    },
  };
};
