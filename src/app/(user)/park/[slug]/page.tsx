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
        <div className="rounded-[2rem] border border-white/45 bg-white/65 px-6 py-5 shadow-[0_24px_48px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_28px_56px_rgba(2,6,23,0.34)]">
          <p className="text-muted-foreground">{t("detailTitle")}</p>
        </div>
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
    <article className="mx-auto max-w-5xl px-4 py-8">
      <section className="rounded-[2rem] border border-white/45 bg-white/65 px-6 py-6 shadow-[0_24px_48px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_28px_56px_rgba(2,6,23,0.34)]">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{publicPark.name}</h1>
          <span className="inline-flex items-center rounded-full border border-emerald-200/60 bg-[linear-gradient(145deg,rgba(22,101,52,0.12),rgba(37,99,235,0.12))] px-2.5 py-1 text-sm leading-none font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-emerald-300/15 dark:bg-[linear-gradient(145deg,rgba(22,101,52,0.22),rgba(37,99,235,0.2))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            {publicPark.type.name}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 items-stretch gap-4 sm:grid-cols-4">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="flex h-full min-h-[5.75rem] flex-col rounded-2xl border border-sky-200/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(237,245,249,0.92))] px-4 py-3 shadow-[0_14px_28px_rgba(148,163,184,0.12),inset_0_1px_0_rgba(255,255,255,0.58)] dark:border-white/8 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.72),rgba(2,6,23,0.52))] dark:shadow-[0_18px_34px_rgba(2,6,23,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <p className="text-xs text-muted-foreground">{fact.label}</p>
              <p className="mt-3 text-sm font-medium">{fact.value}</p>
            </div>
          ))}
          {publicPark.luontoonUrl && (
            <a
              href={publicPark.luontoonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-full min-h-[5.75rem] w-full items-start justify-between gap-3 rounded-2xl border border-sky-200/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(236,245,251,0.94))] px-4 py-3 text-sm font-medium text-primary shadow-[0_14px_28px_rgba(148,163,184,0.12),inset_0_1px_0_rgba(255,255,255,0.6)] transition-colors hover:bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(240,248,253,0.98))] dark:border-sky-300/15 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.74),rgba(2,6,23,0.54))] dark:shadow-[0_18px_34px_rgba(2,6,23,0.22),inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:bg-[linear-gradient(145deg,rgba(15,23,42,0.82),rgba(2,6,23,0.62))]"
              aria-label={`${t("officialLink")} (avautuu uuteen välilehteen)`}
            >
              <span className="pt-[1.125rem]">{t("officialLink")}</span>
              <ExternalLink className="mt-3 h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </section>

      {publicPark.boundaryGeoJson && (
        <section className="mt-8 rounded-[2rem] border border-white/45 bg-white/58 p-5 shadow-[0_24px_48px_rgba(148,163,184,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/42 dark:shadow-[0_28px_56px_rgba(2,6,23,0.3)]">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold tracking-tight">{t("boundaryMapTitle")}</h2>
            </div>
            <Link
              href={`/parks?park=${slug}`}
              prefetch
              className="rounded-full border border-sky-200/70 bg-white/60 px-3 py-1.5 text-sm font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-colors hover:bg-white/82 dark:border-sky-300/15 dark:bg-slate-950/44 dark:hover:bg-slate-950/62"
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
        </section>
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
