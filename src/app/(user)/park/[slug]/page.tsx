import { ExternalLink, FileDown, MapPin } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { DeferredMap } from "@/components/map/deferred-map";
import { LazyParkBoundaryMap } from "@/components/map/lazy-park-boundary-map";
import { StickySectionNavigation } from "@/components/navigation/sticky-section-navigation";
import { ParkAdminControlsProvider, ParkAdminSection } from "@/components/park/park-admin-controls";
import { ParkHero } from "@/components/park/park-hero";
import { ParkTypeBadge } from "@/components/park/park-type-badge";
import { ParkVisitHistory } from "@/components/park/park-visit-history";
import { AppImage } from "@/components/ui/app-image";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { apiAuthFetch } from "@/lib/api";
import { fetchPublicParkDetail, fetchPublicParkVisits } from "@/lib/frontend-summaries";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getParkTypeDisplayName, type ParkDetail, type ParkVisits } from "@/lib/parks";
import { appRoutes, createPathWithSearchParams } from "@/lib/routes";

interface ParkDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    visit?: string | string[];
  }>;
}

const hasStatusCode = (error: unknown, statuses: number[]): error is Error & { status: number } =>
  error instanceof Error &&
  "status" in error &&
  typeof error.status === "number" &&
  statuses.includes(error.status);

const buildParkDetailPath = (slug: string, includeBoundary: boolean) =>
  `/api/parks/${slug}${includeBoundary ? "?includeBoundary=true" : ""}`;

const formatParkMetadataTitle = (slug: string) => slug.replace(/-/g, " ");

// Shared by generateMetadata and the page. Both call it with the same slug and
// always include the boundary, so Next.js request memoization collapses the
// two call sites into a single underlying fetch per request.
const fetchParkDetailForRequest = async (
  slug: string,
): Promise<{
  park: ParkDetail;
  usedAuthenticatedFallback: boolean;
}> => {
  try {
    return {
      park: await fetchPublicParkDetail(slug, { includeBoundary: true }),
      usedAuthenticatedFallback: false,
    };
  } catch (error) {
    if (!hasStatusCode(error, [401, 404])) {
      throw error;
    }

    return {
      park: await apiAuthFetch<ParkDetail>(buildParkDetailPath(slug, true), {
        cache: "no-store",
      }),
      usedAuthenticatedFallback: true,
    };
  }
};

export const generateMetadata = async ({ params }: ParkDetailPageProps) => {
  await connection();

  const [{ slug }, t] = await Promise.all([params, getTranslations("metadata")]);
  const result = await fetchParkDetailForRequest(slug).catch(() => null);
  const parkTitle = result?.park.name ?? formatParkMetadataTitle(slug);
  const shareDescription = t("parkDescription", { park: parkTitle });

  const metadata = buildPageMetadata(parkTitle, t("title"), {
    description: shareDescription,
    pagePath: appRoutes.park(slug),
  });
  return result && !result.usedAuthenticatedFallback
    ? metadata
    : { ...metadata, robots: { index: false, follow: false } };
};

const normalizeVisitSearchParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const ParkDetailPage = async ({ params, searchParams }: ParkDetailPageProps) => {
  // Keep public page rendering request-time so builds do not need the backend.
  // Public detail and visit reads remain explicitly force-cached and tagged;
  // hidden-park fallbacks stay authenticated and uncached.
  await connection();

  const { slug } = await params;
  const { visit } = searchParams ? await searchParams : {};
  const t = await getTranslations("park");
  const normalizedVisit = normalizeVisitSearchParam(visit);
  const parsedVisitId = normalizedVisit ? Number.parseInt(normalizedVisit, 10) : Number.NaN;
  const initialOpenVisitId = Number.isInteger(parsedVisitId) ? parsedVisitId : null;

  // Public detail and visits go out in parallel; only a hidden park (401/404
  // on the detail) redoes the visits read with an authenticated request.
  const [parkResult, publicParkVisits] = await Promise.all([
    fetchParkDetailForRequest(slug).catch(() => null),
    fetchPublicParkVisits(slug).catch(() => null),
  ]);
  const publicPark = parkResult?.park ?? null;

  const parkVisits = parkResult?.usedAuthenticatedFallback
    ? await apiAuthFetch<ParkVisits>(`/api/parks/${slug}/visits`, { cache: "no-store" }).catch(
        () => null,
      )
    : publicParkVisits;

  if (!publicPark) {
    return (
      <article className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-[2rem] border border-border bg-control px-6 py-5 shadow-[0_24px_48px_rgba(var(--shadow-rgb),0.16)] backdrop-blur-xl dark:shadow-[0_28px_56px_rgba(var(--shadow-rgb),0.34)]">
          <p className="text-muted-foreground">{t("detailTitle")}</p>
        </div>
      </article>
    );
  }

  const facts = [
    { label: t("location"), value: publicPark.address },
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
  const logoUrl = publicPark.logo?.url ?? null;
  const mapUrl = publicPark.map?.url ?? null;
  const parkUrl = publicPark.parkUrl ?? null;
  const boundaryGeoJson = publicPark.boundaryGeoJson ?? null;
  const hasAboutLinks = parkUrl !== null || mapUrl !== null;
  const hasBoundaryGeoJson = boundaryGeoJson !== null;

  return (
    <ParkAdminControlsProvider parkSlug={slug}>
      <article className="mx-auto max-w-5xl px-4 py-8">
        <ParkHero
          featuredImage={publicPark.featuredImage ?? null}
          privateMedia={parkResult?.usedAuthenticatedFallback}
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            {logoUrl !== null && (
              <div className="relative h-28 w-48 shrink-0">
                <AppImage
                  src={logoUrl}
                  alt={publicPark.name}
                  fill
                  sizes="192px"
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <h1 className="text-center text-3xl font-bold tracking-tight">{publicPark.name}</h1>
              <ParkTypeBadge label={getParkTypeDisplayName(publicPark)} />
              <CopyLinkButton
                href={appRoutes.park(slug)}
                label={t("copyParkPageLink")}
                copiedLabel={t("parkPageLinkCopied")}
                tooltipSide="top"
                className="inline-flex items-center justify-center rounded-full border border-border bg-control p-2 text-muted-foreground shadow-[0_8px_20px_rgba(var(--shadow-rgb),0.18)] backdrop-blur-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:shadow-[0_12px_24px_rgba(var(--shadow-rgb),0.24)]"
                iconClassName="h-3.5 w-3.5"
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 items-stretch gap-4 sm:grid-cols-4">
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="flex h-full min-h-23 flex-col rounded-2xl border border-border theme-panel group-data-[featured-image=true]/park-hero:bg-hero/65 group-data-[featured-image=true]/park-hero:bg-none px-4 py-3 shadow-[0_14px_28px_rgba(var(--shadow-rgb),0.12),inset_0_1px_0_rgba(var(--highlight-rgb),0.58)] dark:shadow-[0_18px_34px_rgba(var(--shadow-rgb),0.2),inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]"
              >
                <p className="text-xs text-muted-foreground group-data-[featured-image=true]/park-hero:text-hero-foreground/80">
                  {fact.label}
                </p>
                <p className="mt-3 text-sm font-medium">{fact.value}</p>
              </div>
            ))}
            {hasAboutLinks === true && (
              <div className="flex h-full min-h-23 flex-col rounded-2xl border border-border theme-panel group-data-[featured-image=true]/park-hero:bg-hero/65 group-data-[featured-image=true]/park-hero:bg-none px-4 py-3 shadow-[0_14px_28px_rgba(var(--shadow-rgb),0.12),inset_0_1px_0_rgba(var(--highlight-rgb),0.58)] dark:shadow-[0_18px_34px_rgba(var(--shadow-rgb),0.2),inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]">
                <p className="text-xs text-muted-foreground group-data-[featured-image=true]/park-hero:text-hero-foreground/80">
                  {t("aboutTitle")}
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  {parkUrl !== null && (
                    <a
                      href={parkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-link transition-colors hover:text-primary/80 group-data-[featured-image=true]/park-hero:text-hero-foreground"
                      aria-label={`${t("officialLink")} (${t("opensInNewTab")})`}
                    >
                      <span>{t("officialLink")}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  )}
                  {mapUrl !== null && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-link transition-colors hover:text-primary/80 group-data-[featured-image=true]/park-hero:text-hero-foreground"
                      aria-label={`${t("pdfBrochure")} (${t("opensInNewTab")})`}
                    >
                      <span>{t("pdfBrochure")}</span>
                      <FileDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </ParkHero>

        <StickySectionNavigation
          ariaLabel={t("sectionNavigationLabel")}
          className="mt-8"
          items={[
            ...(hasBoundaryGeoJson
              ? [{ id: "park-location", label: t("sectionNav.location") }]
              : []),
            { id: "visit-history", label: t("sectionNav.visits") },
          ]}
        />

        {hasBoundaryGeoJson && (
          <section
            id="park-location"
            className="mt-8 scroll-mt-28 rounded-[2rem] border border-border theme-panel p-5 shadow-[0_24px_48px_rgba(var(--shadow-rgb),0.14)] backdrop-blur-xl dark:shadow-[0_28px_56px_rgba(var(--shadow-rgb),0.3)]"
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-link" aria-hidden="true" />
                <h2 className="text-lg font-semibold tracking-tight">{t("boundaryMapTitle")}</h2>
              </div>
              <Link
                href={createPathWithSearchParams(appRoutes.parks, { park: slug })}
                prefetch
                className="rounded-full border border-border bg-control px-3 py-1.5 text-sm font-medium text-link shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] transition-colors hover:bg-accent"
              >
                {t("showInFinlandsMap")}
              </Link>
            </div>
            <DeferredMap className="min-h-80" label={t("boundaryMapTitle")}>
              <LazyParkBoundaryMap
                boundaryGeoJson={boundaryGeoJson}
                boundingBox={publicPark.boundingBox}
                markerPoint={publicPark.markerPoint}
                parkName={publicPark.name}
              />
            </DeferredMap>
          </section>
        )}

        <ParkVisitHistory
          title={t("visitHistory")}
          addVisitLabel={t("addVisit")}
          noVisitsLabel={t("noVisits")}
          parkSlug={slug}
          initialOpenVisitId={initialOpenVisitId}
          visits={visits}
        />
        <ParkAdminSection />
      </article>
    </ParkAdminControlsProvider>
  );
};

export default ParkDetailPage;
