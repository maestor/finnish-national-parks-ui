import { Footprints, MapPin, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PUBLIC_CONTENT_PANEL_CLASS_NAME,
  PUBLIC_PANEL_ICON_SURFACE_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { cn } from "@/lib/cn";
import type { HomeSummary } from "@/lib/frontend-summaries";
import { appRoutes } from "@/lib/routes";
import { BackToStartLink } from "./back-to-start-link";
import { HomeMemoryHeading } from "./home-memory-heading";
import { HomeParkMemoryCard } from "./home-park-memory-card";
import { HomeVisitMemoryCard } from "./home-visit-memory-card";

export const HomeSpecialVisit = ({
  visit,
  park,
}: {
  visit: HomeSummary["featuredVisit"];
  park: HomeSummary["featuredPark"];
}) => {
  const t = useTranslations("home.specialVisit");
  const homeT = useTranslations("home");
  const featuredT = useTranslations("home.featured");
  if (!visit && !park) return null;
  const imageSizes = visit && park ? undefined : "(max-width: 1023px) calc(100vw - 2rem), 960px";
  return (
    <section aria-labelledby="home-special-visit-title" className={PUBLIC_CONTENT_PANEL_CLASS_NAME}>
      <div className="flex items-center gap-3">
        <span className={PUBLIC_PANEL_ICON_SURFACE_CLASS_NAME}>
          <Star className="h-4 w-4 text-link" aria-hidden="true" />
        </span>
        <h2 id="home-special-visit-title" className="text-lg font-semibold tracking-tight">
          {t("title")}
        </h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
        {t("description")}
      </p>
      <div className={cn("mt-6 grid gap-6", !!visit && !!park && "md:grid-cols-2")}>
        {!!visit && (
          <section aria-labelledby="home-special-visit-subtitle" className="flex min-w-0 flex-col">
            <HomeMemoryHeading
              id="home-special-visit-subtitle"
              title={t("visitSubtitle")}
              href={appRoutes.visits}
              archiveLabel={featuredT("allVisits")}
              icon={Footprints}
            />
            <HomeVisitMemoryCard
              visit={visit}
              idPrefix="home-special-visit"
              headingLevel={4}
              imageLoading="lazy"
              ribbonLabel={t("ribbon")}
              imageSizes={imageSizes}
            />
          </section>
        )}
        {!!park && (
          <section aria-labelledby="home-special-park-subtitle" className="flex min-w-0 flex-col">
            <HomeMemoryHeading
              id="home-special-park-subtitle"
              title={t("parkSubtitle")}
              href={appRoutes.parks}
              archiveLabel={t("allParks")}
              icon={MapPin}
            />
            <HomeParkMemoryCard park={park} imageSizes={imageSizes} />
          </section>
        )}
      </div>
      <div className="mt-5">
        <BackToStartLink label={homeT("backToStart")} />
      </div>
    </section>
  );
};
