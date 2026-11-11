import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PublicCacheRefreshNotice } from "@/components/admin/public-cache-refresh-notice";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { AreaTrails } from "@/components/parks/area-trails";
import { ParkEditTabs } from "@/components/parks/park-edit-tabs";
import { ParkFeaturedImageSection } from "@/components/parks/park-featured-image-section";
import { ParkForm } from "@/components/parks/park-form";
import { SnackbarNotice } from "@/components/providers/snackbar-notice";
import { apiAuthFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { ParkDetail } from "@/lib/parks";
import { appRoutes } from "@/lib/routes";

export const dynamic = "force-dynamic";

interface EditParkPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ updated?: string; refreshFailed?: string; previousSlug?: string }>;
}

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel.parks.edit"),
    getTranslations("metadata"),
  ]);
  return buildPageMetadata(t("title"), metadataT("title"));
};

const EditParkPage = async ({ params, searchParams }: EditParkPageProps) => {
  const t = await getTranslations("controlPanel.parks.edit");
  const { slug } = await params;
  const { updated, refreshFailed, previousSlug } = await searchParams;
  const park = await apiAuthFetch<ParkDetail>(`/api/parks/${slug}`).catch(() => null);

  if (park === null) {
    notFound();
  }

  const isArea = park.category.slug !== "trails-and-routes" && park.catalogStatus === "active";
  const linkedTrails = isArea
    ? (
        await apiAuthFetch<
          paths["/api/admin/parks/{slug}/trails"]["get"]["responses"][200]["content"]["application/json"]
        >(`/api/admin/parks/${slug}/trails`, { cache: "no-store" })
      ).trails
    : [];

  const linkedAreas =
    park.category.slug === "trails-and-routes"
      ? (
          await apiAuthFetch<
            paths["/api/admin/parks/{slug}/areas"]["get"]["responses"][200]["content"]["application/json"]
          >(`/api/admin/parks/${encodeURIComponent(slug)}/areas`, { cache: "no-store" })
        ).areas
      : [];
  const details = (
    <>
      <ParkForm park={park} linkedAreaSlugs={linkedAreas.map((area) => area.slug)} />
      <ParkFeaturedImageSection key={park.slug} slug={park.slug} />
    </>
  );

  return (
    <div>
      <AppBreadcrumbs
        path={appRoutes.controlPanel.parkEdit(slug)}
        entityName={park.name}
        className="mb-4"
      />
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <Link
          href={appRoutes.park(park.slug)}
          className="font-medium text-link underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("viewParkPage")}
        </Link>
      </div>
      {updated === "1" && refreshFailed !== "1" && <SnackbarNotice message={t("updatedNotice")} />}
      {refreshFailed === "1" && (
        <PublicCacheRefreshNotice
          parkSlugs={[park.slug, previousSlug, ...linkedAreas.map((area) => area.slug)]}
          failureMessage={t("refreshFailedNotice")}
          retryLabel={t("retryCacheRefresh")}
          retryingLabel={t("retryingCacheRefresh")}
          successMessage={t("cacheRefreshRetried")}
        />
      )}
      {linkedAreas.length > 0 && (
        <section
          className="mt-6 max-w-3xl rounded-2xl border border-border bg-control p-4"
          aria-labelledby="linked-areas-title"
        >
          <h2 id="linked-areas-title" className="text-lg font-semibold">
            {t("linkedAreasTitle")}
          </h2>
          <ul className="mt-2 space-y-1">
            {linkedAreas.map((area) => (
              <li key={area.slug}>
                <Link
                  href={appRoutes.controlPanel.parkEdit(area.slug)}
                  className="inline-block py-1 font-medium text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {area.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {isArea ? (
        <ParkEditTabs
          key={slug}
          details={details}
          trails={<AreaTrails slug={slug} initialTrails={linkedTrails} />}
        />
      ) : (
        details
      )}
    </div>
  );
};

export default EditParkPage;
