import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifest", () => {
  it("defines install metadata and app icons", () => {
    expect(manifest()).toEqual({
      name: "Reissuvihko",
      short_name: "Reissuvihko",
      description: "Tutki Suomen retkipaikkoja ja seuraa käyntejäsi",
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
          purpose: "any",
        },
        {
          src: "/icons/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
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
    });
  });
});
