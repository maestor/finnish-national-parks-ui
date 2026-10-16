import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

const robots = (): MetadataRoute.Robots => {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/park-access/"],
    },
    sitemap: siteUrl("/sitemap.xml"),
  };
};

export default robots;
