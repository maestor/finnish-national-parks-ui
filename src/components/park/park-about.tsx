import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { ParkMaterialLinks } from "@/components/park/park-material-links";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { SEASON_EMOJIS, type Season } from "@/lib/seasons";

export const ParkAbout = ({
  description,
  seasons,
  parkUrl,
  mapUrl,
}: {
  description: string | null;
  seasons: Season[];
  parkUrl: string | null;
  mapUrl: string | null;
}) => {
  const t = useTranslations("park");
  const hasMaterials = parkUrl !== null || mapUrl !== null;
  return (
    <section
      id="park-about"
      aria-labelledby="park-about-title"
      className="mt-6 scroll-mt-28 overflow-hidden rounded-[2rem] border border-border theme-panel shadow-[0_24px_48px_rgba(var(--shadow-rgb),0.14)] backdrop-blur-xl dark:shadow-[0_28px_56px_rgba(var(--shadow-rgb),0.3)]"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-link" aria-hidden="true" />
          <h2 id="park-about-title" className="text-lg font-semibold tracking-tight">
            {t("aboutTitle")}
          </h2>
        </div>
        {description !== null && <MarkdownContent className="mt-4">{description}</MarkdownContent>}
        {seasons.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-border/60 bg-control/45 px-4 py-3">
            <h3
              id="park-seasons-title"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {t("experiencedSeasons")}
            </h3>
            <ul aria-labelledby="park-seasons-title" className="flex flex-wrap gap-x-5 gap-y-3">
              {seasons.map((season) => (
                <li key={season} className="inline-flex items-center gap-2 text-sm font-medium">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/50 text-lg shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.3)]"
                  >
                    {SEASON_EMOJIS[season]}
                  </span>
                  <span>{t(`seasons.${season}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {hasMaterials === true && (
        <div className="border-t border-border/70 bg-control/35 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("materialsTitle")}
            </h3>
            <ParkMaterialLinks parkUrl={parkUrl} mapUrl={mapUrl} />
          </div>
        </div>
      )}
    </section>
  );
};
