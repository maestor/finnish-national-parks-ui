import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

const openStreetMap = {
  source: "openStreetMap",
  href: "https://www.openstreetmap.org/copyright",
  detail: "odbl",
} as const;

const lipas = {
  source: "lipas",
  href: "https://www.jyu.fi/fi/liikunta/yhteistyo/lipas-liikunnan-paikkatietojarjestelma/avoimet-rajapinnat-ja-ladattavat-lipas-aineistot",
  detail: "ccBy",
} as const;

const sourceGroups = [
  {
    title: "maps",
    sources: [openStreetMap],
  },
  {
    title: "places",
    sources: [
      lipas,
      {
        source: "syke",
        href: "https://www.syke.fi/fi/ymparistotieto/kayttolupa-ja-vastuut",
        detail: "ccBy",
      },
      {
        source: "museovirasto",
        href: "https://www.museovirasto.fi/fi/palvelut-ja-ohjeet/tietojarjestelmat/kulttuuriympariston-tietojarjestelmat/kulttuuriympaeristoen-paikkatietoaineistot",
        detail: "ccBy",
      },
      {
        source: "landSurvey",
        href: "https://www.maanmittauslaitos.fi/avoindata-lisenssi-cc40",
        detail: "ccBy",
      },
      {
        source: "helsinkiOpenData",
        href: "https://kartta.hel.fi/avoindata/",
        detail: "ccBy",
      },
      openStreetMap,
    ],
  },
  {
    title: "routes",
    sources: [
      openStreetMap,
      lipas,
      {
        source: "geoapify",
        href: "https://www.geoapify.com/terms-and-conditions/",
        detail: "geoapifyUsage",
      },
    ],
  },
  {
    title: "weather",
    sources: [
      {
        source: "fmi",
        href: "https://www.ilmatieteenlaitos.fi/avoin-data-lisenssi",
        detail: "ccBy",
      },
    ],
  },
] as const;

const licenseUrls = {
  ccBy: "https://creativecommons.org/licenses/by/4.0/deed.fi",
  odbl: "https://opendatacommons.org/licenses/odbl/1-0/",
  geoapifyUsage: null,
} as const;

export const HomeDataSources = () => {
  const t = useTranslations("home.social.dataSources");

  return (
    <details className="group">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <span className="underline underline-offset-4">{t("title")}</span>
        <ChevronDown aria-hidden="true" className="size-4 group-open:rotate-180" />
      </summary>
      <div className="mt-2 columns-1 gap-8 rounded-xl border border-border bg-control p-4 sm:columns-2">
        {sourceGroups.map(({ title, sources }) => (
          <div key={title} className="mb-5 break-inside-avoid last:mb-0">
            <h3 className="text-sm font-semibold text-foreground">{t(title)}</h3>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              {sources.map(({ source, href, detail }) => {
                const licenseUrl = licenseUrls[detail];
                return (
                  <li key={source}>
                    <a
                      className="text-link underline underline-offset-2"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t(source)}
                    </a>
                    {" · "}
                    {licenseUrl ? (
                      <a
                        className="text-link whitespace-nowrap underline underline-offset-2"
                        href={licenseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t(detail)}
                      </a>
                    ) : (
                      t(detail)
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
};
