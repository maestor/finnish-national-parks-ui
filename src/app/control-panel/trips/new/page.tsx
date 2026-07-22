import { getTranslations } from "next-intl/server";
import { TripForm } from "@/components/trips/trip-form";
import { buildPageMetadata } from "@/lib/page-metadata";

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
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <TripForm />
    </div>
  );
};

export default NewTripPage;
