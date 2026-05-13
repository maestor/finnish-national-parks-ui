import type { MetadataRoute } from "next";

const manifest = (): MetadataRoute.Manifest => {
  return {
    name: "Suomen kansallispuistot",
    short_name: "Kansallispuistot",
    description: "Tutki Suomen kansallispuistoja ja seuraa käyntejäsi",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
};

export default manifest;
