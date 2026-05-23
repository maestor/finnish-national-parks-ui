import { ParkBoundaryMap } from "@/components/map/park-boundary-map";
import { ParkVisitHistory } from "@/components/park/park-visit-history";
import { fetchPublicParkDetail, fetchPublicParkVisits } from "@/lib/public-summaries";
import { ExternalLink, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

interface ParkDetailPageProps {
  params: Promise<{ slug: string }>;
}

export const generateMetadata = async ({ params }: ParkDetailPageProps) => {
  const { slug } = await params;
  const park = await fetchPublicParkDetail(slug).catch(() => null);

  return {
    title: park?.name ?? slug.replace(/-/g, " "),
  };
};

const ParkDetailPage = async ({ params }: ParkDetailPageProps) => {
  const { slug } = await params;
  const t = await getTranslations("park");

  const publicPark = await fetchPublicParkDetail(slug, { includeBoundary: true }).catch(() => null);

  const parkVisits = await fetchPublicParkVisits(slug).catch(() => null);

  if (!publicPark) {
    return (
      <article className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-muted-foreground">{t("detailTitle")}</p>
      </article>
    );
  }

  const facts = [
    { label: t("location"), value: publicPark.location },
    ...(publicPark.areaKm2 !== null
      ? [{ label: t("area"), value: `${publicPark.areaKm2} km²` }]
      : []),
    ...(publicPark.establishmentYear !== null
      ? [
          {
            label: t("established"),
            value: String(publicPark.establishmentYear),
          },
        ]
      : []),
  ];

  const visits = parkVisits?.visits ?? [];

  return (
    <article className="mx-auto md:w-full max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{publicPark.name}</h1>
        <span className="inline-flex items-center rounded-full border bg-primary/10 px-2.5 py-1 text-sm leading-none font-medium text-primary">
          {publicPark.type.name}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 items-end gap-4 sm:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label}>
            <p className="text-xs text-muted-foreground">{fact.label}</p>
            <p className="mt-0.5 text-sm font-medium">{fact.value}</p>
          </div>
        ))}
        {publicPark.luontoonUrl && (
          <a
            href={publicPark.luontoonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            aria-label={`${t("officialLink")} (avautuu uuteen välilehteen)`}
          >
            {t("officialLink")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>

      {publicPark.boundaryGeoJson && (
        <div className="mt-8">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold tracking-tight">{t("boundaryMapTitle")}</h2>
            </div>
            <Link
              href={`/parks?park=${slug}`}
              prefetch
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("showInFinlandsMap")}
            </Link>
          </div>
          <ParkBoundaryMap
            boundaryGeoJson={publicPark.boundaryGeoJson}
            boundingBox={publicPark.boundingBox}
            markerPoint={publicPark.markerPoint}
            parkName={publicPark.name}
          />
        </div>
      )}

      <ParkVisitHistory
        title={t("visitHistory")}
        addVisitLabel={t("addVisit")}
        noVisitsLabel={t("noVisits")}
        parkSlug={slug}
        visits={visits}
      />
    </article>
  );
};

export default ParkDetailPage;
