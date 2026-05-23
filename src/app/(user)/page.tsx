import { HomeVisitStats } from "@/components/dashboard/home-visit-stats";
import { LatestVisitEntries } from "@/components/dashboard/latest-visit-entries";
import { MostVisitedParks } from "@/components/dashboard/most-visited-parks";
import { RecentVisits } from "@/components/dashboard/recent-visits";
import { HomeIntro } from "@/components/home/home-intro";
import { apiFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";
import { type VisitWithPark, buildVisitedSummaryByParkSlug } from "@/lib/parks";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const t = await getTranslations("home");
  return {
    title: t("title"),
  };
};

type ApiPark =
  paths["/api/parks"]["get"]["responses"][200]["content"]["application/json"]["parks"][number];

type AuthUser = paths["/auth/me"]["get"]["responses"][200]["content"]["application/json"];

const HomePage = async () => {
  const t = await getTranslations("home");
  const [parksResult, visitsResult, authResult] = await Promise.allSettled([
    apiFetch<{ parks: ApiPark[] }>("/api/parks"),
    apiFetch<{ visits: VisitWithPark[] }>("/api/visits"),
    apiFetch<AuthUser>("/auth/me"),
  ]);

  const parks = parksResult.status === "fulfilled" ? parksResult.value.parks : [];
  const visits = visitsResult.status === "fulfilled" ? visitsResult.value.visits : [];
  const canManageVisits = authResult.status === "fulfilled";
  const visitedSummaryByParkSlug = buildVisitedSummaryByParkSlug(visits);
  const uniqueParks = new Set(visits.map((visit) => visit.park.slug)).size;

  const typeMap = new Map<string, { label: string; visited: number; total: number }>();
  for (const park of parks) {
    const hasVisits = (visitedSummaryByParkSlug.get(park.slug)?.visitCount ?? 0) > 0;
    const existing = typeMap.get(park.type.slug);

    if (existing) {
      existing.total += 1;
      if (hasVisits) {
        existing.visited += 1;
      }
      continue;
    }

    typeMap.set(park.type.slug, {
      label: park.type.name,
      visited: hasVisits ? 1 : 0,
      total: 1,
    });
  }

  const progressItems =
    parks.length > 0
      ? [
          {
            label: t("statistics.allParks"),
            visited: uniqueParks,
            total: parks.length,
          },
          ...Array.from(typeMap.values()).sort((left, right) =>
            left.label.localeCompare(right.label, "fi-FI"),
          ),
        ]
      : [];

  const mostVisitedParks = parks
    .map((park) => ({
      parkName: park.name,
      parkSlug: park.slug,
      visitCount: visitedSummaryByParkSlug.get(park.slug)?.visitCount ?? 0,
    }))
    .filter((park) => park.visitCount > 0)
    .sort(
      (left, right) =>
        right.visitCount - left.visitCount || left.parkName.localeCompare(right.parkName, "fi-FI"),
    )
    .slice(0, 5);

  const recentVisits = [...visits]
    .sort((left, right) => right.visitedOn.localeCompare(left.visitedOn))
    .slice(0, 5)
    .map((visit) => ({
      id: visit.id,
      parkName: visit.park.name,
      parkSlug: visit.park.slug,
      visitedOn: visit.visitedOn,
    }));

  const latestVisitEntries = [...visits]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 5)
    .map((visit) => ({
      id: visit.id,
      parkName: visit.park.name,
      parkSlug: visit.park.slug,
      createdAt: visit.createdAt,
    }));

  const descriptionParagraphs = t("description")
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
      <HomeIntro
        title={t("title")}
        summary={t("summary")}
        descriptionParagraphs={descriptionParagraphs}
        openMapLabel={t("openMap")}
        infoClosedLabel={t("intro.showInfo")}
        infoOpenLabel={t("intro.hideInfo")}
      />

      <HomeVisitStats
        sectionTitle={t("statistics.title")}
        totalVisitsLabel={t("statistics.totalVisits")}
        totalVisits={visits.length}
        progressItems={progressItems}
      />
      <div className="mt-4 space-y-4">
        <MostVisitedParks
          title={t("mostVisitedParks.title")}
          emptyMessage={t("mostVisitedParks.empty")}
          visitCountLabel={t("mostVisitedParks.visitCount")}
          parks={mostVisitedParks}
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <RecentVisits
            title={t("recentVisits.title")}
            emptyMessage={t("recentVisits.empty")}
            visits={recentVisits}
            showEditLinks={canManageVisits}
          />
          <LatestVisitEntries
            title={t("latestEntries.title")}
            emptyMessage={t("latestEntries.empty")}
            visits={latestVisitEntries}
            showEditLinks={canManageVisits}
          />
        </div>
      </div>
    </main>
  );
};

export default HomePage;
