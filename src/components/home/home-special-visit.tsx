import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PUBLIC_CONTENT_PANEL_CLASS_NAME,
  PUBLIC_PANEL_ICON_SURFACE_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import type { HomeSummary } from "@/lib/frontend-summaries";
import { BackToStartLink } from "./back-to-start-link";
import { HomeVisitMemoryCard } from "./home-visit-memory-card";

export const HomeSpecialVisit = ({ visit }: { visit: HomeSummary["featuredVisit"] }) => {
  const t = useTranslations("home.specialVisit");
  const homeT = useTranslations("home");
  if (!visit) return null;
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
      <div className="mt-5">
        <HomeVisitMemoryCard
          visit={visit}
          idPrefix="home-special-visit"
          headingLevel={3}
          imageLoading="lazy"
          ribbonLabel={t("ribbon")}
          imageSizes="(max-width: 1023px) calc(100vw - 2rem), 960px"
        />
      </div>
      <div className="mt-5">
        <BackToStartLink label={homeT("backToStart")} />
      </div>
    </section>
  );
};
