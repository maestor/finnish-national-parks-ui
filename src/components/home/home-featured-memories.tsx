import { ArrowRight, Footprints, Route } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { TripMemoryCard } from "@/components/trips/trip-archive-card";
import type { HomeSummary } from "@/lib/frontend-summaries";
import { appRoutes } from "@/lib/routes";
import { HomeVisitMemoryCard } from "./home-visit-memory-card";

type HomeFeaturedMemoriesProps = Pick<HomeSummary, "latestTrip" | "latestStandaloneVisit">;

const ARCHIVE_LINK_CLASS_NAME =
  "ml-auto inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-control px-3.5 py-1 text-xs font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const EMPTY_CLASS_NAME =
  "flex flex-1 items-center justify-center rounded-[2rem] border border-border bg-control p-6 text-sm text-muted-foreground";

export const HomeFeaturedMemories = ({
  latestTrip,
  latestStandaloneVisit: visit,
}: HomeFeaturedMemoriesProps) => {
  const t = useTranslations("home.featured");
  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <section aria-labelledby="home-latest-trip" className="flex min-w-0 flex-col">
        <div className="mb-3 flex min-w-0 items-end justify-between gap-3">
          <h3
            id="home-latest-trip"
            className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold"
          >
            <Route className="h-4 w-4 shrink-0 text-icon stroke-[2.25]" aria-hidden="true" />
            {t("latestTrip")}
          </h3>
          <Link href={appRoutes.trips} prefetch={false} className={ARCHIVE_LINK_CLASS_NAME}>
            {t("allTrips")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        {latestTrip ? (
          <TripMemoryCard trip={latestTrip} headingLevel={4} imageLoading="eager" />
        ) : (
          <p className={EMPTY_CLASS_NAME}>{t("emptyTrip")}</p>
        )}
      </section>
      <section aria-labelledby="home-latest-visit" className="flex min-w-0 flex-col">
        <div className="mb-3 flex min-w-0 items-end justify-between gap-3">
          <h3
            id="home-latest-visit"
            className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold"
          >
            <Footprints className="h-4 w-4 shrink-0 text-icon stroke-[2.25]" aria-hidden="true" />
            {t("latestVisit")}
          </h3>
          <Link href={appRoutes.visits} prefetch={false} className={ARCHIVE_LINK_CLASS_NAME}>
            {t("allVisits")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        {visit ? (
          <HomeVisitMemoryCard
            visit={visit}
            idPrefix="home-visit"
            headingLevel={4}
            imageLoading="eager"
          />
        ) : (
          <p className={EMPTY_CLASS_NAME}>{t("emptyVisit")}</p>
        )}
      </section>
    </div>
  );
};
