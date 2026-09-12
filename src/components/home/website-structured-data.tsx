import { siteUrl } from "@/lib/site-url";

interface WebsiteStructuredDataProps {
  name: string;
  description: string;
}

export const WebsiteStructuredData = ({ name, description }: WebsiteStructuredDataProps) => {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": siteUrl("/#website"),
    url: siteUrl("/"),
    name,
    description,
    inLanguage: "fi",
  };

  // JSON data only, using existing translated copy. Escaping < keeps even
  // HTML-like strings from closing the script element in server-rendered HTML.
  return (
    <script type="application/ld+json">{JSON.stringify(data).replace(/</g, "\\u003c")}</script>
  );
};
