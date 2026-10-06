import { Footprints, Route } from "lucide-react";
import { useTranslations } from "next-intl";
import { TripMemoryCard } from "@/components/trips/trip-archive-card";
import type { HomeSummary } from "@/lib/frontend-summaries";
import { appRoutes } from "@/lib/routes";
import { HomeMemoryHeading } from "./home-memory-heading";
import { HomeVisitMemoryCard } from "./home-visit-memory-card";

type HomeFeaturedMemoriesProps = Pick<HomeSummary, "latestTrip" | "latestStandaloneVisit">;

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
        <HomeMemoryHeading
          id="home-latest-trip"
          title={t("latestTrip")}
          href={appRoutes.trips}
          archiveLabel={t("allTrips")}
          icon={Route}
        />
        {latestTrip ? (
          <TripMemoryCard trip={latestTrip} headingLevel={4} imageLoading="eager" />
        ) : (
          <p className={EMPTY_CLASS_NAME}>{t("emptyTrip")}</p>
        )}
      </section>
      <section aria-labelledby="home-latest-visit" className="flex min-w-0 flex-col">
        <HomeMemoryHeading
          id="home-latest-visit"
          title={t("latestVisit")}
          href={appRoutes.visits}
          archiveLabel={t("allVisits")}
          icon={Footprints}
        />
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
