import { ParkManagement } from "@/components/parks/park-management";
import { ADMIN_PARK_VISIBILITY_TAG } from "@/lib/admin-cache";
import { apiAuthFetch } from "@/lib/api";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { AdminParkVisibilityResponse } from "@/lib/parks";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel"),
    getTranslations("metadata"),
  ]);
  return buildPageMetadata(t("parks.title"), metadataT("title"));
};

const ParksPage = async () => {
  const { visibleParks, removedParks } = await apiAuthFetch<AdminParkVisibilityResponse>(
    "/api/admin/parks/visibility",
    {
      cache: "force-cache",
      next: {
        tags: [ADMIN_PARK_VISIBILITY_TAG],
      },
    },
  );

  return <ParkManagement parks={visibleParks} removedParks={removedParks} />;
};

export default ParksPage;
