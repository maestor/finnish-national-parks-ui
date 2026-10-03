import { ArrowRight, Footprints, Images, Route } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  PUBLIC_META_BADGE_CLASS_NAME,
  PUBLIC_META_DATE_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { TripMemoryCard } from "@/components/trips/trip-archive-card";
import { PublicMemoryCard } from "@/components/ui/public-memory-card";
import { formatFinnishDate } from "@/lib/fi-date";
import type { HomeSummary } from "@/lib/frontend-summaries";
import { createParkVisitHref } from "@/lib/public-visits";
import { appRoutes } from "@/lib/routes";

type HomeFeaturedMemoriesProps = Pick<HomeSummary, "latestTrip" | "latestStandaloneVisit">;

const ARCHIVE_LINK_CLASS_NAME =
  "ml-auto inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-white/55 bg-white/70 px-3.5 py-2 text-xs font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-slate-950/56 dark:text-sky-100/80";
const EMPTY_CLASS_NAME =
  "flex flex-1 items-center justify-center rounded-[2rem] border border-white/45 bg-white/62 p-6 text-sm text-muted-foreground dark:border-white/10 dark:bg-slate-950/48";

export const HomeFeaturedMemories = ({
  latestTrip,
  latestStandaloneVisit: visit,
}: HomeFeaturedMemoriesProps) => {
  const t = useTranslations("home.featured");
  const parkT = useTranslations("park");
  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <section aria-labelledby="home-latest-trip" className="flex min-w-0 flex-col">
        <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
          <h3
            id="home-latest-trip"
            className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold"
          >
            <Route className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {t("latestTrip")}
          </h3>
          <Link href={appRoutes.trips} prefetch={false} className={ARCHIVE_LINK_CLASS_NAME}>
            {t("allTrips")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        {latestTrip ? (
          <TripMemoryCard trip={latestTrip} headingLevel={4} />
        ) : (
          <p className={EMPTY_CLASS_NAME}>{t("emptyTrip")}</p>
        )}
      </section>
      <section aria-labelledby="home-latest-visit" className="flex min-w-0 flex-col">
        <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
          <h3
            id="home-latest-visit"
            className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold"
          >
            <Footprints className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {t("latestVisit")}
          </h3>
          <Link href={appRoutes.visits} prefetch={false} className={ARCHIVE_LINK_CLASS_NAME}>
            {t("allVisits")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        {visit ? (
          <PublicMemoryCard
            id={`home-visit-${visit.id}`}
            title={visit.park.name}
            headingLevel={4}
            href={createParkVisitHref({ parkSlug: visit.park.slug, visitId: visit.id })}
            featuredImage={visit.featuredImage}
            descriptionExcerpt={visit.descriptionExcerpt}
            descriptionPlaceholder={t("notePlaceholder")}
            readMore={t("readVisit")}
            metadata={
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-foreground/75 dark:text-sky-100/75">
                <span className={PUBLIC_META_DATE_CLASS_NAME}>
                  <time dateTime={visit.visitedOn}>{formatFinnishDate(visit.visitedOn)}</time>
                </span>
                <span className={PUBLIC_META_BADGE_CLASS_NAME}>
                  <Images className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {parkT("imageCount", { count: visit.imageCount })}
                </span>
              </div>
            }
          />
        ) : (
          <p className={EMPTY_CLASS_NAME}>{t("emptyVisit")}</p>
        )}
      </section>
    </div>
  );
};
