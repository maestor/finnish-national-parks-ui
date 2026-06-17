import { HomeVisitStats } from "@/components/dashboard/home-visit-stats";
import { MostVisitedParks } from "@/components/dashboard/most-visited-parks";
import { HomeActivityPanels } from "@/components/home/home-activity-panels";
import { HomeIntro } from "@/components/home/home-intro";
import {
  createHomeLatestVisitEntriesFromSummary,
  createHomeMostVisitedParks,
  createHomeProgressItems,
  createHomeRecentVisitsFromSummary,
  fetchPublicHomeSummary,
} from "@/lib/public-summaries";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const t = await getTranslations("home");
  return {
    title: t("title"),
  };
};

const HomePage = async () => {
  const t = await getTranslations("home");
  const summary = await fetchPublicHomeSummary();
  const progressItems = createHomeProgressItems(summary, t("statistics.allParks"));
  const mostVisitedParks = createHomeMostVisitedParks(summary);
  const recentVisits = createHomeRecentVisitsFromSummary(summary);
  const latestVisitEntries = createHomeLatestVisitEntriesFromSummary(summary);

  const descriptionParagraphs = t("description")
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
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
        totalVisits={summary.totalVisits}
        progressItems={progressItems}
        seasonalVisitsLabel={t("statistics.seasonalVisits")}
        seasonalVisits={summary.seasonalVisitCounts}
        springLabel={t("statistics.seasons.spring")}
        summerLabel={t("statistics.seasons.summer")}
        autumnLabel={t("statistics.seasons.autumn")}
        winterLabel={t("statistics.seasons.winter")}
      />
      <div className="mt-4 space-y-4">
        <MostVisitedParks
          title={t("mostVisitedParks.title")}
          emptyMessage={t("mostVisitedParks.empty")}
          visitCountLabel={t("mostVisitedParks.visitCount")}
          parks={mostVisitedParks}
        />
        <HomeActivityPanels
          recentVisitsTitle={t("recentVisits.title")}
          recentVisitsEmptyMessage={t("recentVisits.empty")}
          latestEntriesTitle={t("latestEntries.title")}
          latestEntriesEmptyMessage={t("latestEntries.empty")}
          fallbackRecentVisits={recentVisits}
          fallbackLatestVisitEntries={latestVisitEntries}
        />
      </div>
    </div>
  );
};

export default HomePage;
