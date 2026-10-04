import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { HomeVisitStats } from "@/components/dashboard/home-visit-stats";
import { HomeAboutSection } from "@/components/home/home-about-section";
import { HomeFeaturedMemories } from "@/components/home/home-featured-memories";
import { HomeIntro } from "@/components/home/home-intro";
import { HomeSocialLinks } from "@/components/home/home-social-links";
import { HomeSpecialVisit } from "@/components/home/home-special-visit";
import { WebsiteStructuredData } from "@/components/home/website-structured-data";
import { PUBLIC_PAGE_SHELL_CLASS_NAME } from "@/components/layout/public-page-styles";
import { createHomeProgressItems, fetchHomeSummary } from "@/lib/frontend-summaries";
import { buildPageMetadata } from "@/lib/page-metadata";

export const generateMetadata = async () => {
  const metadataT = await getTranslations("metadata");
  return buildPageMetadata(metadataT("homeTitle"), metadataT("title"), {
    absoluteTitle: true,
    pagePath: "/",
    description: metadataT("description"),
  });
};

const HomePage = async () => {
  // Keep page rendering request-time so builds do not need the backend.
  // fetchHomeSummary remains explicitly force-cached and tag-revalidated.
  await connection();
  const [t, metadataT] = await Promise.all([getTranslations("home"), getTranslations("metadata")]);
  const summary = await fetchHomeSummary();
  const progressItems = createHomeProgressItems(
    summary,
    t("statistics.allParks"),
    t("statistics.magnetHunt"),
  );

  const descriptionParagraphs = t("description")
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div id="home-top" className={`${PUBLIC_PAGE_SHELL_CLASS_NAME} scroll-mt-24 sm:scroll-mt-28`}>
      <WebsiteStructuredData name={metadataT("title")} description={t("summary")} />
      <HomeIntro
        title={t("title")}
        summary={t("summary")}
        openMapLabel={t("openMap")}
        infoLabel={t("intro.showInfo")}
      />

      <HomeVisitStats
        featuredMemories={
          <HomeFeaturedMemories
            latestTrip={summary.latestTrip}
            latestStandaloneVisit={summary.latestStandaloneVisit}
          />
        }
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

      <HomeSpecialVisit visit={summary.featuredVisit} />

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
