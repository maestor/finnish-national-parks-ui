import { VisitAccordion } from "@/components/park/visit-accordion";
import { apiFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";
import type { PersonalPark } from "@/lib/parks";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

interface ParkDetailPageProps {
  params: Promise<{ slug: string }>;
}

type ApiPark = paths["/api/parks/{slug}"]["get"]["responses"][200]["content"]["application/json"];

export const generateMetadata = async ({ params }: ParkDetailPageProps) => {
  const { slug } = await params;
  return {
    title: slug.replace(/-/g, " "),
  };
};

const ParkDetailPage = async ({ params }: ParkDetailPageProps) => {
  const { slug } = await params;
  const t = await getTranslations("park");

  const publicPark = await apiFetch<ApiPark>(`/api/parks/${slug}`).catch(() => null);

  const personalPark = await apiFetch<PersonalPark>(`/api/me/parks/${slug}`).catch(() => null);

  if (!publicPark) {
    return (
      <article className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">{t("detailTitle")}</p>
      </article>
    );
  }

  const facts = [
    { label: t("location"), value: publicPark.locationLabel },
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

  const visits = personalPark?.visits ?? [];

  return (
    <article className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{publicPark.name}</h1>
        <span className="inline-flex items-center rounded-full border bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
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
            className="inline-flex w-fit items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("officialLink")}
          </a>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{t("visitHistory")}</h2>
          <Link
            href={`/control-panel/visits/new?park=${slug}`}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            {t("addVisit")}
          </Link>
        </div>

        {visits.length > 0 ? (
          <div className="mt-4">
            <VisitAccordion visits={visits} />
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground">{t("noVisits")}</p>
        )}
      </div>
    </article>
  );
};

export default ParkDetailPage;
