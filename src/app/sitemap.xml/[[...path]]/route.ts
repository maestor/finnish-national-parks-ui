import { buildSitemap } from "@/lib/sitemap";

// Cache on the first request without contacting the API during builds.
export const dynamic = "force-static";
export const generateStaticParams = () => [];

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) => {
  const { path } = await params;
  if (path?.length) return new Response(null, { status: 404 });

  const entries = await buildSitemap();
  const urls = entries.map(({ url }) => {
    const escaped = url.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      };
      return entities[character];
    });
    return `<url><loc>${escaped}</loc></url>`;
  });
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
