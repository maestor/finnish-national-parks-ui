import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebsiteStructuredData } from "./website-structured-data";

describe("homepage website identity", () => {
  it("exposes the existing site identity as parseable JSON-LD without visible content", () => {
    const html = renderToStaticMarkup(
      <WebsiteStructuredData name="Reissuvihko" description="Retkimuistoja Suomesta." />,
    );
    const document = new DOMParser().parseFromString(html, "text/html");
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(JSON.parse(script?.textContent ?? "")).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "https://reissuvihko.example.com/#website",
      url: "https://reissuvihko.example.com/",
      name: "Reissuvihko",
      description: "Retkimuistoja Suomesta.",
      inLanguage: "fi",
    });
    expect(document.body.textContent).toBe("");
  });

  it("keeps HTML-like translated text inside the JSON value", () => {
    const description = '</script><img src=x onerror="alert(1)">';
    const html = renderToStaticMarkup(
      <WebsiteStructuredData name="Reissuvihko" description={description} />,
    );
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.querySelectorAll("script")).toHaveLength(1);
    expect(document.querySelector("img")).toBeNull();
    expect(JSON.parse(document.querySelector("script")?.textContent ?? "").description).toBe(
      description,
    );
  });
});
