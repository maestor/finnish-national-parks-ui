import type { Metadata } from "next";

interface BuildPageMetadataOptions {
  absoluteTitle?: boolean;
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
  const shareTitle = options?.absoluteTitle ? pageTitle : buildShareTitle(pageTitle, siteTitle);
  const normalizedDescription = options?.description?.replace(/\s+/g, " ").trim();
  const description =
    normalizedDescription && normalizedDescription.length > 160
      ? `${normalizedDescription.slice(0, 159).replace(/\s+\S*$/, "")}…`
      : normalizedDescription;
  // Canonicals and social URLs describe the page, not a UI-state variant.
  // Keep supported query parameters and fragments out of both signals even
  // if a caller passes the current browser URL by mistake.
  const pagePath = options?.pagePath?.split(/[?#]/, 1)[0];
  // Child social metadata replaces the root objects in Next.js, including
  // file-based images. Each page must explicitly keep a share image.
  const socialImagePath = options?.socialImagePath;

  return {
    title: options?.absoluteTitle ? { absolute: pageTitle } : pageTitle,
    ...(pagePath ? { alternates: { canonical: pagePath } } : {}),
    ...(description ? { description } : {}),
    openGraph: {
      title: shareTitle,
      siteName: siteTitle,
      locale: "fi_FI",
      ...(pagePath ? { type: "website" as const, url: pagePath } : {}),
      ...(description ? { description } : {}),
      images: [socialImagePath || "/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      ...(description ? { description } : {}),
      images: [socialImagePath || "/twitter-image"],
    },
  };
};
