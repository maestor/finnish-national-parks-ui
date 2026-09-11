import { getTranslations } from "next-intl/server";
import {
  PUBLIC_EYEBROW_BADGE_CLASS_NAME,
  PUBLIC_HERO_DESCRIPTION_CLASS_NAME,
  PUBLIC_PAGE_SHELL_CLASS_NAME,
  PUBLIC_PANEL_CLASS_NAME,
} from "@/components/layout/public-page-styles";

export const TripArchiveLoading = async () => {
  const t = await getTranslations("tripsArchive");

  return (
    <div className={PUBLIC_PAGE_SHELL_CLASS_NAME}>
      <section className={PUBLIC_PANEL_CLASS_NAME} aria-busy="true">
        <p className={PUBLIC_EYEBROW_BADGE_CLASS_NAME}>{t("eyebrow")}</p>
        <div className="mt-4 h-10 w-48 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
        <p className={`${PUBLIC_HERO_DESCRIPTION_CLASS_NAME} mt-3`}>{t("loading")}</p>
      </section>
      <section className={PUBLIC_PANEL_CLASS_NAME} aria-label={t("listLabel")} aria-busy="true">
        <p role="status" className="text-sm text-muted-foreground">
          {t("loading")}
        </p>
        <ul className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
          {["one", "two", "three", "four"].map((skeletonKey) => (
            <li
              key={skeletonKey}
              className="h-72 animate-pulse rounded-3xl bg-muted/60 motion-reduce:animate-none"
            />
          ))}
        </ul>
      </section>
    </div>
  );
};
