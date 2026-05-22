import { ProgressSection } from "@/components/dashboard/progress-section";
import { RecentVisits } from "@/components/dashboard/recent-visits";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { apiFetch } from "@/lib/api";
import { type Park, type VisitWithPark, buildVisitedSummaryByParkSlug } from "@/lib/parks";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const t = await getTranslations("controlPanel");
  return {
    title: t("title"),
  };
};

const ControlPanelPage = async () => {
  const t = await getTranslations("controlPanel.dashboard");
  const [{ parks }, { visits }] = await Promise.all([
    apiFetch<{ parks: Park[] }>("/api/parks"),
    apiFetch<{ visits: VisitWithPark[] }>("/api/visits"),
  ]);

  const totalVisits = visits.length;
  const uniqueParks = new Set(visits.map((visit) => visit.park.slug)).size;
  const visitsWithNotes = visits.filter((visit) => visit.note !== null).length;
  const visitedSummaryByParkSlug = buildVisitedSummaryByParkSlug(visits);

  const mostVisitedPark = parks.reduce<{ name: string; visitCount: number } | null>((max, park) => {
    const count = visitedSummaryByParkSlug.get(park.slug)?.visitCount ?? 0;
    if (count > 0 && (!max || count > max.visitCount)) {
      return { name: park.name, visitCount: count };
    }
    return max;
  }, null);

  const typeMap = new Map<string, { typeName: string; visited: number; total: number }>();
  for (const park of parks) {
    const visitCount = visitedSummaryByParkSlug.get(park.slug)?.visitCount ?? 0;
    const slug = park.type.slug;
    const existing = typeMap.get(slug);
    if (existing) {
      existing.total += 1;
      if (visitCount > 0) {
        existing.visited += 1;
      }
    } else {
      typeMap.set(slug, {
        typeName: park.type.name,
        visited: visitCount > 0 ? 1 : 0,
        total: 1,
      });
    }
  }
  const progressItems = Array.from(typeMap.values()).sort((a, b) =>
    a.typeName.localeCompare(b.typeName),
  );

  const recentVisits = visits
    .map((visit) => ({
      id: visit.id,
      parkName: visit.park.name,
      parkSlug: visit.park.slug,
      visitedOn: visit.visitedOn,
    }))
    .sort((a, b) => new Date(b.visitedOn).getTime() - new Date(a.visitedOn).getTime())
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <StatsCards
        totalVisits={totalVisits}
        uniqueParks={uniqueParks}
        parksWithNotes={visitsWithNotes}
        mostVisitedPark={mostVisitedPark}
      />
      <ProgressSection items={progressItems} />
      <RecentVisits visits={recentVisits} />
    </div>
  );
};

export default ControlPanelPage;
