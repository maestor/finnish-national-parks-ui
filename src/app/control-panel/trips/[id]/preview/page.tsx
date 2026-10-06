import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { PublicTripPage } from "@/components/trips/public-trip-page";
import { ApiError } from "@/lib/api";
import { fetchAdminTripPreview } from "@/lib/public-trip";
import { appRoutes } from "@/lib/routes";

export const dynamic = "force-dynamic";

interface TripPreviewPageProps {
  params: Promise<{ id: string }>;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("controlPanel.trips.preview");
  return { title: t("title"), robots: { index: false, follow: false } };
};

const TripPreviewPage = async ({ params }: TripPreviewPageProps) => {
  const t = await getTranslations("controlPanel.trips.preview");
  const { id } = await params;
  const tripId = Number(id);
  if (!Number.isInteger(tripId) || tripId < 1) notFound();

  const trip = await fetchAdminTripPreview(tripId).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });
  if (trip === null) notFound();

  return (
    <main className="space-y-6">
      <AppBreadcrumbs path={appRoutes.controlPanel.previewTrip(trip.id)} className="mb-4" />
      <div className="rounded-3xl border border-amber-300/60 bg-amber-50/90 p-5 text-amber-950 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
        <p className="font-semibold">{t("banner")}</p>
        <p className="mt-1 text-sm">{t("description")}</p>
        <Link
          href={appRoutes.controlPanel.editTrip(trip.id)}
          className="mt-3 inline-flex rounded-md underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("backToEdit")}
        </Link>
      </div>
      <PublicTripPage trip={trip} isPreview />
    </main>
  );
};

export default TripPreviewPage;
