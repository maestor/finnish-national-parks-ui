import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TripManagement } from "@/components/trips/trip-management";
import { apiFetch } from "@/lib/api";
import { buildPageMetadata } from "@/lib/page-metadata";
import { appRoutes } from "@/lib/routes";
import type { Trip } from "@/lib/trips";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel"),
    getTranslations("metadata"),
  ]);
  return buildPageMetadata(t("trips.title"), metadataT("title"));
};

const TripsPage = async () => {
  const t = await getTranslations("controlPanel.trips");
  const { trips } = await apiFetch<{ trips: Trip[] }>("/api/trips");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <Link
          href={appRoutes.controlPanel.newTrip}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("addTrip")}
        </Link>
      </div>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <TripManagement trips={trips} />
    </div>
  );
};

export default TripsPage;
