import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PublicCacheRefreshNotice } from "@/components/admin/public-cache-refresh-notice";
import { SnackbarNotice } from "@/components/providers/snackbar-notice";
import { VisitForm } from "@/components/visits/visit-form";
import { VisitImageSection } from "@/components/visits/visit-image-section";
import { ApiError, apiAuthFetch } from "@/lib/api";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { AdminVisitWithPark } from "@/lib/parks";
import { appRoutes } from "@/lib/routes";

export const dynamic = "force-dynamic";

interface EditVisitPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; refreshFailed?: string; status?: string }>;
}

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel"),
    getTranslations("metadata"),
  ]);
  return buildPageMetadata(t("visits.editVisit.title"), metadataT("title"));
};

const EditVisitPage = async ({ params, searchParams }: EditVisitPageProps) => {
  const t = await getTranslations("controlPanel.visits.editVisit");
  const { id } = await params;
  const { created, status, refreshFailed } = await searchParams;
  const visitId = Number(id);

  const visitToEdit = await apiAuthFetch<AdminVisitWithPark>(`/api/admin/visits/${visitId}`, {
    cache: "no-store",
  }).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });

  if (visitToEdit === null) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <div className="mt-3 flex flex-col items-start gap-2">
        <Link
          href={appRoutes.park(visitToEdit.park.slug)}
          className="inline-flex text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("viewParkPage")}
        </Link>
        <Link
          href={appRoutes.controlPanel.previewVisit(visitToEdit.id)}
          className="inline-flex text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("previewSavedContent")}
        </Link>
      </div>
      {created === "1" && refreshFailed !== "1" && (
        <SnackbarNotice
          message={status === "draft" ? t("draftCreatedNotice") : t("publishedCreatedNotice")}
        />
      )}
      {created === "1" && refreshFailed === "1" && (
        <PublicCacheRefreshNotice
          parkSlug={visitToEdit.park.slug}
          tripSlugs={[visitToEdit.trip?.slug]}
          failureMessage={t("refreshFailedNotice")}
          retryLabel={t("retryCacheRefresh")}
          retryingLabel={t("retryingCacheRefresh")}
          successMessage={t("cacheRefreshRetried")}
        />
      )}
      <VisitForm parks={[]} visitToEdit={visitToEdit} />
      <VisitImageSection
        visitId={visitToEdit.id}
        images={visitToEdit.images}
        parkSlug={visitToEdit.park.slug}
        sectionTitle={t("manageImages")}
        tripSlug={visitToEdit.trip?.slug ?? null}
      />
    </div>
  );
};

export default EditVisitPage;
