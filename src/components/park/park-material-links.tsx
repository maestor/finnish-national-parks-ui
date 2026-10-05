import { ArrowUpRight, FileDown, Globe2 } from "lucide-react";
import { useTranslations } from "next-intl";

const LINK_CLASS_NAME =
  "group inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-control px-3 py-2.5 text-sm font-medium text-link shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.35)] transition-colors hover:border-link/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const ParkMaterialLinks = ({
  parkUrl,
  mapUrl,
}: {
  parkUrl: string | null;
  mapUrl: string | null;
}) => {
  const t = useTranslations("park");
  return (
    <div className="flex flex-wrap gap-2">
      {parkUrl !== null && (
        <a
          href={parkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS_NAME}
          aria-label={`${t("officialLink")} (${t("opensInNewTab")})`}
        >
          <Globe2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t("officialLink")}</span>
          <ArrowUpRight
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-link"
            aria-hidden="true"
          />
        </a>
      )}
      {mapUrl !== null && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS_NAME}
          aria-label={`${t("pdfBrochure")} (${t("opensInNewTab")})`}
        >
          <FileDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t("pdfBrochure")}</span>
          <ArrowUpRight
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-link"
            aria-hidden="true"
          />
        </a>
      )}
    </div>
  );
};
