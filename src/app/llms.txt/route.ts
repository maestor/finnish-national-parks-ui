import { appRoutes } from "@/lib/routes";
import { siteUrl } from "@/lib/site-url";
import messages from "../../../messages/fi.json";

export const dynamic = "force-static";

export const GET = () => {
  const { agentDiscovery, layout, metadata } = messages;
  const pages = [
    [layout.nav.home, appRoutes.home, metadata.description],
    [layout.nav.map, appRoutes.parks, metadata.parksDescription],
    [layout.nav.visits, appRoutes.visits, metadata.visitsDescription],
    [layout.nav.trips, appRoutes.trips, metadata.tripsDescription],
    [layout.nav.tripPlanner, appRoutes.tripPlanner, metadata.tripPlannerDescription],
  ];
  const body = [
    `# ${metadata.title}`,
    "",
    `> ${metadata.description}`,
    "",
    `## ${agentDiscovery.pagesTitle}`,
    "",
    ...pages.map(([label, path, description]) => `- [${label}](${siteUrl(path)}): ${description}`),
    "",
    `## ${agentDiscovery.resourcesTitle}`,
    "",
    `- [${agentDiscovery.sitemapLabel}](${siteUrl("/sitemap.xml")}): ${agentDiscovery.sitemapDescription}`,
    "",
  ].join("\n");

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
