import Link from "next/link";
import { useTranslations } from "next-intl";
import { PUBLIC_EMPTY_STATE_PANEL_CLASS_NAME } from "@/components/layout/public-page-styles";
import { appRoutes } from "@/lib/routes";
import type { HomeTripStoryModel } from "@/lib/trip-stories";
import { TripStoryCard } from "./trip-story-card";

export const HomeTripStories = ({
  model,
  error,
}: {
  model: HomeTripStoryModel;
  error: string | null;
}) => {
  const t = useTranslations("home.tripStories");
  if (error) {
    return (
      <section role="alert" className={PUBLIC_EMPTY_STATE_PANEL_CLASS_NAME}>
        <h2 className="text-lg font-semibold">{t("errorTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </section>
    );
  }
  if (!model.featured) {
    return (
      <section className={PUBLIC_EMPTY_STATE_PANEL_CLASS_NAME}>
        <h2 className="text-lg font-semibold">{t("emptyTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("emptyDescription")}</p>
        <Link
          href={appRoutes.trips}
          className="mt-4 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold"
        >
          {t("openArchive")}
        </Link>
      </section>
    );
  }
  return (
    <div className="space-y-8">
      <section aria-labelledby="home-featured-trip-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="home-featured-trip-title" className="text-2xl font-bold tracking-tight">
            {model.featuredReason === "manual" ? t("featuredTitle") : t("latestTitle")}
          </h2>
        </div>
        <TripStoryCard story={model.featured} variant="featured" />
      </section>
      {model.recent.length > 0 && (
        <section aria-labelledby="home-recent-trips-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 id="home-recent-trips-title" className="text-2xl font-bold tracking-tight">
              {t("recentTitle")}
            </h2>
            <Link
              href={appRoutes.trips}
              className="text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("all")}
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {model.recent.map((story) => (
              <TripStoryCard key={story.slug} story={story} />
            ))}
          </div>
        </section>
      )}
      {model.seasonalMemory !== null && (
        <section aria-labelledby="home-seasonal-trip-title">
          <h2 id="home-seasonal-trip-title" className="mb-3 text-2xl font-bold tracking-tight">
            {t("seasonalTitle", { count: model.seasonalMemory.yearsAgo })}
          </h2>
          <TripStoryCard story={model.seasonalMemory.story} />
        </section>
      )}
    </div>
  );
};
