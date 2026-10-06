import { CalendarRange, MapPin, Scan } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { PublicMetaBadge } from "@/components/layout/public-meta-badge";
import {
  PUBLIC_EYEBROW_BADGE_CLASS_NAME,
  PUBLIC_HERO_BREADCRUMB_CLASS_NAME,
  PUBLIC_HERO_ICON_BUTTON_CLASS_NAME,
  PUBLIC_HERO_TITLE_CLASS_NAME,
  PUBLIC_META_BADGE_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { DeferredMap } from "@/components/map/deferred-map";
import { LazyParkBoundaryMap } from "@/components/map/lazy-park-boundary-map";
import { StickySectionNavigation } from "@/components/navigation/sticky-section-navigation";
import { ParkAbout } from "@/components/park/park-about";
import {
  ParkAdminControlsProvider,
  ParkAdminSection,
  ParkEditLink,
} from "@/components/park/park-admin-controls";
import { ParkHero } from "@/components/park/park-hero";
import { ParkMaterialLinks } from "@/components/park/park-material-links";
import { ParkTypeBadge } from "@/components/park/park-type-badge";
import { ParkVisitHistory } from "@/components/park/park-visit-history";
import { AppImage } from "@/components/ui/app-image";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { apiAuthFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fetchPublicParkDetail, fetchPublicParkVisits } from "@/lib/frontend-summaries";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getParkTypeDisplayName, type ParkDetail, type ParkVisits } from "@/lib/parks";
import { appRoutes, createPathWithSearchParams } from "@/lib/routes";

import { getVisitSeason, SEASONS } from "@/lib/seasons";

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
      <article className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6">
        <div className="rounded-[2rem] border border-border bg-control px-6 py-5 shadow-[0_24px_48px_rgba(var(--shadow-rgb),0.16)] backdrop-blur-xl dark:shadow-[0_28px_56px_rgba(var(--shadow-rgb),0.34)]">
          <p className="text-muted-foreground">{t("detailTitle")}</p>
        </div>
      </article>
    );
  }

  const visits = parkVisits?.visits ?? [];
  const logoUrl = publicPark.logo?.url ?? null;
  const mapUrl = publicPark.map?.url ?? null;
  const parkUrl = publicPark.parkUrl ?? null;
  const description = publicPark.description?.trim() || null;
  const experiencedSeasons = new Set(visits.map((visit) => getVisitSeason(visit.visitedOn)));
  const seasons = SEASONS.filter((season) => experiencedSeasons.has(season));
  const hasAbout = description !== null || seasons.length > 0;
  const boundaryGeoJson = publicPark.boundaryGeoJson ?? null;
  const hasBoundaryGeoJson = boundaryGeoJson !== null;

  return (
    <ParkAdminControlsProvider parkSlug={slug}>
      <article className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6">
        <ParkHero
          featuredImage={publicPark.featuredImage ?? null}
          privateMedia={parkResult?.usedAuthenticatedFallback}
        >
          <AppBreadcrumbs
            path={appRoutes.park(slug)}
            entityName={publicPark.name}
            className={PUBLIC_HERO_BREADCRUMB_CLASS_NAME}
          />
          <div
            className={`${PUBLIC_EYEBROW_BADGE_CLASS_NAME} group-data-[featured-image=true]/park-hero:border-input group-data-[featured-image=true]/park-hero:bg-hero group-data-[featured-image=true]/park-hero:bg-none group-data-[featured-image=true]/park-hero:text-hero-foreground`}
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            <span>{t("eyebrow")}</span>
          </div>
          <div
            className={cn(
              "mt-2 flex flex-wrap items-start gap-y-3",
              logoUrl !== null && "@min-[36rem]:pr-48",
            )}
          >
            {logoUrl !== null && (
              <div className="relative mx-auto h-28 w-48 shrink-0 self-center @min-[36rem]:absolute @min-[36rem]:top-1/2 @min-[36rem]:right-0 @min-[36rem]:-translate-y-1/2 @min-[36rem]:group-data-[featured-image=true]/park-hero:right-6">
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
            <div className="min-w-0 flex-[1_1_24rem] text-center @min-[36rem]:text-left">
              <h1 className={`${PUBLIC_HERO_TITLE_CLASS_NAME} wrap-break-word hyphens-auto`}>
                {publicPark.name}
              </h1>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 @min-[36rem]:justify-start">
                <ParkTypeBadge label={getParkTypeDisplayName(publicPark)} />
                {publicPark.establishmentYear !== null && (
                  <PublicMetaBadge label={t("established")}>
                    <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{publicPark.establishmentYear}</span>
                  </PublicMetaBadge>
                )}
                {publicPark.areaKm2 !== null && (
                  <PublicMetaBadge label={t("area")}>
                    <Scan className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{publicPark.areaKm2} km²</span>
                  </PublicMetaBadge>
                )}
                <CopyLinkButton
                  href={appRoutes.park(slug)}
                  label={t("copyParkPageLink")}
                  copiedLabel={t("parkPageLinkCopied")}
                  tooltipSide="top"
                  className={PUBLIC_HERO_ICON_BUTTON_CLASS_NAME}
                  iconClassName="h-3.5 w-3.5"
                />
                <ParkEditLink />
              </div>
            </div>
          </div>
        </ParkHero>

        <StickySectionNavigation
          ariaLabel={t("sectionNavigationLabel")}
          className="mt-4"
          items={[
            { id: "park-location", label: t("sectionNav.location") },
            ...(hasAbout ? [{ id: "park-about", label: t("sectionNav.about") }] : []),
            {
              id: "visit-history",
              initialTargetId: visits.some((visit) => visit.id === initialOpenVisitId)
                ? `park-visit-${initialOpenVisitId}`
                : undefined,
              label: t("sectionNav.visits"),
            },
          ]}
        />

        <section
          id="park-location"
          className="mt-6 scroll-mt-28 rounded-[2rem] border border-border theme-panel p-5 shadow-[0_24px_48px_rgba(var(--shadow-rgb),0.14)] backdrop-blur-xl dark:shadow-[0_28px_56px_rgba(var(--shadow-rgb),0.3)]"
        >
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-link" aria-hidden="true" />
              <h2 className="text-lg font-semibold tracking-tight">
                {t(hasBoundaryGeoJson ? "boundaryMapTitle" : "location")}
              </h2>
            </div>
            <Link
              href={createPathWithSearchParams(appRoutes.parks, { park: slug })}
              prefetch
              className="rounded-full border border-border bg-control px-3 py-1.5 text-sm font-medium text-link shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] transition-colors hover:bg-accent"
            >
              {t("showInFinlandsMap")}
            </Link>
          </div>
          {hasBoundaryGeoJson && (
            <DeferredMap className="min-h-80" label={t("boundaryMapTitle")}>
              <LazyParkBoundaryMap
                boundaryGeoJson={boundaryGeoJson}
                boundingBox={publicPark.boundingBox}
                markerPoint={publicPark.markerPoint}
                parkName={publicPark.name}
              />
            </DeferredMap>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`${PUBLIC_META_BADGE_CLASS_NAME} max-w-full`}>
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="wrap-break-word">{publicPark.address}</span>
            </span>
          </div>
          {hasAbout === false && (parkUrl !== null || mapUrl !== null) && (
            <div className="mt-3">
              <ParkMaterialLinks parkUrl={parkUrl} mapUrl={mapUrl} />
            </div>
          )}
        </section>

        {hasAbout === true && (
          <ParkAbout
            description={description}
            seasons={seasons}
            parkUrl={parkUrl}
            mapUrl={mapUrl}
          />
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
