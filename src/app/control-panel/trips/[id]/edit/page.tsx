import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TripForm } from "@/components/trips/trip-form";
import { TripVisitAssignments } from "@/components/trips/trip-visit-assignments";
import { apiFetch } from "@/lib/api";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { VisitWithPark } from "@/lib/parks";
import { appRoutes } from "@/lib/routes";
import type { TripDetail } from "@/lib/trips";

export const dynamic = "force-dynamic";

interface EditTripPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
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
  const { created } = await searchParams;
  const tripId = Number(id);

  if (Number.isNaN(tripId)) {
    notFound();
  }

  const [tripToEdit, { visits }] = await Promise.all([
    apiFetch<TripDetail>(`/api/trips/${tripId}`).catch(() => null),
    apiFetch<{ visits: VisitWithPark[] }>("/api/visits"),
  ]);

  if (tripToEdit === null) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <Link
        href={appRoutes.trip(tripToEdit.slug)}
        className="mt-3 inline-flex text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {t("viewTripPage")}
      </Link>
      {created === "1" && (
        <output
          aria-live="polite"
          className="mt-4 block rounded-lg border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200"
        >
          {t("createdNotice")}
        </output>
      )}
      <TripForm tripToEdit={tripToEdit} />
      <TripVisitAssignments trip={tripToEdit} visits={visits} />
    </div>
  );
};

export default EditTripPage;
