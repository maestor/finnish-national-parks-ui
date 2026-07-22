import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TripForm } from "@/components/trips/trip-form";
import { TripVisitAssignments } from "@/components/trips/trip-visit-assignments";
import { apiFetch } from "@/lib/api";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { VisitWithPark } from "@/lib/parks";
import type { Trip } from "@/lib/trips";

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

  const [{ trips }, { visits }] = await Promise.all([
    apiFetch<{ trips: Trip[] }>("/api/trips"),
    apiFetch<{ visits: VisitWithPark[] }>("/api/visits"),
  ]);
  const tripToEdit = trips.find((trip) => trip.id === tripId) ?? null;

  if (tripToEdit === null) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      {created === "1" ? (
        <output
          aria-live="polite"
          className="mt-4 block rounded-lg border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200"
        >
          {t("createdNotice")}
        </output>
      ) : null}
      <TripForm tripToEdit={tripToEdit} />
      <TripVisitAssignments trip={tripToEdit} visits={visits} />
    </div>
  );
};

export default EditTripPage;
