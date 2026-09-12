import type { Metadata } from "next";

interface BuildPageMetadataOptions {
  description?: string;
  pagePath?: string;
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
  const normalizedDescription = options?.description?.replace(/\s+/g, " ").trim();
  const description =
    normalizedDescription && normalizedDescription.length > 180
      ? `${normalizedDescription.slice(0, 177).replace(/\s+\S*$/, "")}…`
      : normalizedDescription;
  const pagePath = options?.pagePath;
  const socialImagePath = options?.socialImagePath;

  return {
    title: pageTitle,
    ...(pagePath ? { alternates: { canonical: pagePath } } : {}),
    ...(description ? { description } : {}),
    openGraph: {
      title: shareTitle,
      siteName: siteTitle,
      locale: "fi_FI",
      ...(pagePath ? { type: "website" as const, url: pagePath } : {}),
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
