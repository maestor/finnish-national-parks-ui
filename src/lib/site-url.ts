import { siteEnv } from "./env";

export const resolveMetadataBase = (): URL => {
  const configured =
    siteEnv.NEXT_PUBLIC_SITE_URL ?? siteEnv.VERCEL_PROJECT_PRODUCTION_URL ?? siteEnv.VERCEL_URL;
  if (!configured) return new URL("http://localhost:4300");
  const absolute = /^https?:\/\//.test(configured) ? configured : `https://${configured}`;
  return new URL(new URL(absolute).origin);
};

export const siteUrl = (path: string): string => new URL(path, resolveMetadataBase()).href;
