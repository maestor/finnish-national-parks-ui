import type { Metadata } from "next";

interface BuildPageMetadataOptions {
  description?: string;
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

  return {
    title: pageTitle,
    ...(description ? { description } : {}),
    openGraph: {
      title: shareTitle,
      ...(description ? { description } : {}),
    },
    twitter: {
      title: shareTitle,
      ...(description ? { description } : {}),
    },
  };
};
