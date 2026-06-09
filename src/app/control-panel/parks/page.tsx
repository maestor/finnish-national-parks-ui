import { ParkManagement } from "@/components/parks/park-management";
import { ADMIN_PARK_VISIBILITY_TAG } from "@/lib/admin-cache";
import { apiFetch } from "@/lib/api";
import type { AdminParkVisibilityResponse } from "@/lib/parks";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const t = await getTranslations("controlPanel");
  return {
    title: t("parks.title"),
  };
};

const ParksPage = async () => {
  const { visibleParks, removedParks } = await apiFetch<AdminParkVisibilityResponse>(
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
