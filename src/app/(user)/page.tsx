import { getTranslations } from "next-intl/server";
import { HomeVisitStats } from "@/components/dashboard/home-visit-stats";
import { HomeAboutSection } from "@/components/home/home-about-section";
import { HomeIntro } from "@/components/home/home-intro";
import { HomeSocialLinks } from "@/components/home/home-social-links";
import { HomeSummaryPanels } from "@/components/home/home-summary-panels";
import { PUBLIC_PAGE_SHELL_CLASS_NAME } from "@/components/layout/public-page-styles";
import { HomeTripStories } from "@/components/trip-stories/home-trip-stories";
import {
  createHomeLatestTripsFromSummary,
  createHomeLatestVisitEntriesFromSummary,
  createHomeMostVisitedParks,
  createHomeProgressItems,
  createHomeRecentVisitsFromSummary,
  fetchHomeSummary,
} from "@/lib/frontend-summaries";
import { fetchTripStories, selectHomeTripStories } from "@/lib/trip-stories";

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
  const [summary, tripStoriesResult] = await Promise.all([
    fetchHomeSummary(),
    fetchTripStories()
      .then((response) => ({ error: null, stories: response.stories }))
      .catch((failure) => ({
        error: failure instanceof Error ? failure.message : "Unknown error",
        stories: [],
      })),
  ]);
  const progressItems = createHomeProgressItems(summary, t("statistics.allParks"));
  const mostVisitedParks = createHomeMostVisitedParks(summary);
  const recentVisits = createHomeRecentVisitsFromSummary(summary);
  const latestVisitEntries = createHomeLatestVisitEntriesFromSummary(summary);
  const latestTrips = createHomeLatestTripsFromSummary(summary);
  const homeTripStories = selectHomeTripStories(tripStoriesResult.stories, new Date());

  const descriptionParagraphs = t("description")
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div id="home-top" className={`${PUBLIC_PAGE_SHELL_CLASS_NAME} scroll-mt-24 sm:scroll-mt-28`}>
      <HomeIntro
        title={t("title")}
        summary={t("summary")}
        openMapLabel={t("openMap")}
        infoLabel={t("intro.showInfo")}
      />

      <HomeTripStories model={homeTripStories} error={tripStoriesResult.error} />

      <HomeVisitStats
        sectionTitle={t("statistics.title")}
        totalVisitsLabel={t("statistics.totalVisits")}
        totalVisits={summary.totalVisits}
        progressItems={progressItems}
        backToStartLabel={t("backToStart")}
        seasonalVisitsLabel={t("statistics.seasonalVisits")}
        seasonalVisits={summary.seasonalVisitCounts}
        springLabel={t("statistics.seasons.spring")}
        summerLabel={t("statistics.seasons.summer")}
        autumnLabel={t("statistics.seasons.autumn")}
        winterLabel={t("statistics.seasons.winter")}
      />
      <HomeSummaryPanels
        recentVisitsTitle={t("recentVisits.title")}
        recentVisitsEmptyMessage={t("recentVisits.empty")}
        latestEntriesTitle={t("latestEntries.title")}
        latestEntriesEmptyMessage={t("latestEntries.empty")}
        mostVisitedParksTitle={t("mostVisitedParks.title")}
        mostVisitedParksEmptyMessage={t("mostVisitedParks.empty")}
        mostVisitedParksVisitCountLabel={t("mostVisitedParks.visitCount")}
        latestTripsTitle={t("latestTrips.title")}
        latestTripsEmptyMessage={t("latestTrips.empty")}
        backToStartLabel={t("backToStart")}
        fallbackRecentVisits={recentVisits}
        fallbackLatestVisitEntries={latestVisitEntries}
        fallbackMostVisitedParks={mostVisitedParks}
        fallbackLatestTrips={latestTrips}
      />

      <HomeAboutSection
        title={t("aboutTitle")}
        descriptionParagraphs={descriptionParagraphs}
        backToStartLabel={t("backToStart")}
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
      </HomeAboutSection>
    </div>
  );
};

export default HomePage;
