import { getTranslations } from "next-intl/server";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { TripForm } from "@/components/trips/trip-form";
import { buildPageMetadata } from "@/lib/page-metadata";
import { appRoutes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel"),
    getTranslations("metadata"),
  ]);
  return buildPageMetadata(t("trips.newTrip.title"), metadataT("title"));
};

const NewTripPage = async () => {
  const t = await getTranslations("controlPanel.trips.newTrip");

  return (
    <div>
      <AppBreadcrumbs path={appRoutes.controlPanel.newTrip} className="mb-4" />
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <TripForm />
    </div>
  );
};

export default NewTripPage;
