import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PublicCacheRefreshNotice } from "@/components/admin/public-cache-refresh-notice";
import { SnackbarNotice } from "@/components/providers/snackbar-notice";
import { TripFeaturedImageSection } from "@/components/trips/trip-featured-image-section";
import { TripForm } from "@/components/trips/trip-form";
import { TripVisitAssignments } from "@/components/trips/trip-visit-assignments";
import { ApiError, apiAuthFetch } from "@/lib/api";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { AdminVisitWithPark } from "@/lib/parks";
import { appRoutes } from "@/lib/routes";
import type { AdminTripDetail } from "@/lib/trips";

export const dynamic = "force-dynamic";

interface EditTripPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; refreshFailed?: string; status?: string }>;
}

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel"),
    getTranslations("metadata"),
  ]);
  return buildPageMetadata(t("trips.editTrip.title"), metadataT("title"));
};

const EditTripPage = async ({ params, searchParams }: EditTripPageProps) => {
  const t = await getTranslations("controlPanel.trips.editTrip");
  const { id } = await params;
  const { created, status, refreshFailed } = await searchParams;
  const tripId = Number(id);

  if (Number.isNaN(tripId)) {
    notFound();
  }

  const [tripToEdit, { visits }] = await Promise.all([
    apiAuthFetch<AdminTripDetail>(`/api/admin/trips/${tripId}`, { cache: "no-store" }).catch(
      (error: unknown) => {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      },
    ),
    apiAuthFetch<{ visits: AdminVisitWithPark[] }>("/api/admin/visits", { cache: "no-store" }),
  ]);

  if (tripToEdit === null) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <div className="mt-3 flex flex-col items-start gap-2">
        <Link
          href={appRoutes.trip(tripToEdit.slug)}
          className="inline-flex text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("viewTripPage")}
        </Link>
        <Link
          href={appRoutes.controlPanel.previewTrip(tripToEdit.id)}
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
          tripSlugs={[tripToEdit.slug]}
          failureMessage={t("refreshFailedNotice")}
          retryLabel={t("retryCacheRefresh")}
          retryingLabel={t("retryingCacheRefresh")}
          successMessage={t("cacheRefreshRetried")}
        />
      )}
      <TripForm tripToEdit={tripToEdit} />
      <TripFeaturedImageSection slug={tripToEdit.slug} tripId={tripToEdit.id} />
      <TripVisitAssignments trip={tripToEdit} visits={visits} />
    </div>
  );
};

export default EditTripPage;
