import { getTranslations } from "next-intl/server";
import {
  PUBLIC_EYEBROW_BADGE_CLASS_NAME,
  PUBLIC_HERO_DESCRIPTION_CLASS_NAME,
  PUBLIC_HERO_HEADING_STACK_CLASS_NAME,
  PUBLIC_HERO_TITLE_CLASS_NAME,
  PUBLIC_PAGE_SHELL_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { TripStoryArchive } from "@/components/trip-stories/trip-story-archive";
import { buildPageMetadata } from "@/lib/page-metadata";
import { fetchTripStories, filterTripStories, parseTripStoryFilters } from "@/lib/trip-stories";

export const dynamic = "force-dynamic";

interface TripsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([getTranslations("trips"), getTranslations("metadata")]);
  return buildPageMetadata(t("title"), metadataT("title"), {
    description: t("description"),
    pagePath: "/retket",
  });
};

const TripsPage = async ({ searchParams }: TripsPageProps) => {
  const t = await getTranslations("trips");
  const params = await searchParams;
  let stories = [] as Awaited<ReturnType<typeof fetchTripStories>>["stories"];
  let error: string | null = null;
  try {
    stories = (await fetchTripStories()).stories;
  } catch (failure) {
    error = failure instanceof Error ? failure.message : t("errorTitle");
  }
  const filters = parseTripStoryFilters(params, stories);
  return (
    <main className={PUBLIC_PAGE_SHELL_CLASS_NAME}>
      <header className={PUBLIC_HERO_HEADING_STACK_CLASS_NAME}>
        <span className={PUBLIC_EYEBROW_BADGE_CLASS_NAME}>{t("eyebrow")}</span>
        <h1 className={PUBLIC_HERO_TITLE_CLASS_NAME}>{t("title")}</h1>
        <p className={PUBLIC_HERO_DESCRIPTION_CLASS_NAME}>{t("description")}</p>
      </header>
      <TripStoryArchive
        stories={stories}
        filteredStories={filterTripStories(stories, filters)}
        filters={filters}
        error={error}
      />
    </main>
  );
};

export default TripsPage;
