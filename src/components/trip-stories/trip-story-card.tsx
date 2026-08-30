import Link from "next/link";
import { useTranslations } from "next-intl";
import { PUBLIC_PANEL_CLASS_NAME } from "@/components/layout/public-page-styles";
import { formatFinnishDateRange } from "@/lib/fi-date";
import { appRoutes } from "@/lib/routes";
import type { TripStorySummary } from "@/lib/trips";
import { TripStoryCover } from "./trip-story-cover";

export const TripStoryCard = ({
  story,
  variant = "compact",
}: {
  story: TripStorySummary;
  variant?: "compact" | "featured";
}) => {
  const t = useTranslations("trips");
  const dateRange = story.dateRange
    ? formatFinnishDateRange(story.dateRange.start, story.dateRange.end)
    : t("datesMissing");
  const counts = [
    story.visitCount > 0 ? t("visitsCount", { count: story.visitCount }) : null,
    story.stopCount > 0 ? t("stopsCount", { count: story.stopCount }) : null,
    story.imageCount > 0 ? t("imagesCount", { count: story.imageCount }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={`${PUBLIC_PANEL_CLASS_NAME} ${variant === "featured" ? "grid gap-6 md:grid-cols-2 md:items-center" : "space-y-4"}`}
    >
      <TripStoryCover story={story} priority={variant === "featured"} />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {story.featured === true && (
            <span className="rounded-full bg-primary/10 px-2.5 py-1">{t("featured")}</span>
          )}
          <span>{dateRange}</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          <Link
            href={appRoutes.trip(story.slug)}
            className="rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {story.name}
          </Link>
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {story.summary ?? t("fallbackSummary")}
        </p>
        {story.places.length > 0 && (
          <p className="text-sm text-foreground/75">
            {story.places
              .slice(0, 3)
              .map((place) => place.name)
              .join(", ")}
            {story.places.length > 3 ? ` +${story.places.length - 3} muuta` : ""}
          </p>
        )}
        {counts && <p className="text-xs font-medium text-muted-foreground">{counts}</p>}
        {variant === "featured" && (
          <Link
            href={appRoutes.trip(story.slug)}
            className="inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("read")}
          </Link>
        )}
      </div>
    </article>
  );
};
