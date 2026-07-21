import { getTranslations } from "next-intl/server";
import { HomeVisitStats } from "@/components/dashboard/home-visit-stats";
import { MostVisitedParks } from "@/components/dashboard/most-visited-parks";
import { HomeActivityPanels } from "@/components/home/home-activity-panels";
import { HomeIntro } from "@/components/home/home-intro";
import { HomeSocialLinks } from "@/components/home/home-social-links";
import { PUBLIC_PAGE_SHELL_CLASS_NAME } from "@/components/layout/public-page-styles";
import {
  createHomeLatestVisitEntriesFromSummary,
  createHomeMostVisitedParks,
  createHomeProgressItems,
  createHomeRecentVisitsFromSummary,
  fetchHomeSummary,
} from "@/lib/frontend-summaries";

// Reads use force-cache tagged fetches, but force-dynamic keeps Next from
// prerendering this page at build time, when no backend is reachable.
export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const t = await getTranslations("home");
  return {
    title: t("title"),
  };
};

const HomePage = async () => {
  const t = await getTranslations("home");
  const summary = await fetchHomeSummary();
  const progressItems = createHomeProgressItems(summary, t("statistics.allParks"));
  const mostVisitedParks = createHomeMostVisitedParks(summary);
  const recentVisits = createHomeRecentVisitsFromSummary(summary);
  const latestVisitEntries = createHomeLatestVisitEntriesFromSummary(summary);

  const descriptionParagraphs = t("description")
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className={PUBLIC_PAGE_SHELL_CLASS_NAME}>
      <HomeIntro
        title={t("title")}
        summary={t("summary")}
        descriptionParagraphs={descriptionParagraphs}
        openMapLabel={t("openMap")}
        infoClosedLabel={t("intro.showInfo")}
        infoOpenLabel={t("intro.hideInfo")}
      >
        <HomeSocialLinks
          sectionLabel={t("social.sectionLabel")}
          title={t("social.title")}
          linkedInLabel={t("social.linkedin")}
          linkedInText={t("social.linkedinText")}
          githubUiLabel={t("social.githubUi")}
          githubUiText={t("social.githubUiText")}
          githubApiLabel={t("social.githubApi")}
          githubApiText={t("social.githubApiText")}
          copyrightLabel={t("social.copyright")}
        />
      </HomeIntro>

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
      <div className="space-y-6">
        <HomeActivityPanels
          recentVisitsTitle={t("recentVisits.title")}
          recentVisitsEmptyMessage={t("recentVisits.empty")}
          latestEntriesTitle={t("latestEntries.title")}
          latestEntriesEmptyMessage={t("latestEntries.empty")}
          fallbackRecentVisits={recentVisits}
          fallbackLatestVisitEntries={latestVisitEntries}
        />
        <MostVisitedParks
          title={t("mostVisitedParks.title")}
          emptyMessage={t("mostVisitedParks.empty")}
          visitCountLabel={t("mostVisitedParks.visitCount")}
          parks={mostVisitedParks}
        />
      </div>
    </div>
  );
};

export default HomePage;
