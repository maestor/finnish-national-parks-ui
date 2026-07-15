import { TripPlannerPage } from "@/components/trip-planner/trip-planner-page";
import { buildPageMetadata } from "@/lib/page-metadata";
import { getTranslations } from "next-intl/server";

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("tripPlanner"),
    getTranslations("metadata"),
  ]);

  return buildPageMetadata(t("title"), metadataT("title"), {
    description: t("description"),
  });
};

const PublicTripPlannerPage = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TripPlannerPage />
    </div>
  );
};

export default PublicTripPlannerPage;
