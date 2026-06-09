import { ParkManagement } from "@/components/parks/park-management";
import { ADMIN_REMOVED_PARKS_TAG, ADMIN_VISIBLE_PARKS_TAG } from "@/lib/admin-cache";
import { apiFetch } from "@/lib/api";
import type { Park } from "@/lib/parks";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const t = await getTranslations("controlPanel");
  return {
    title: t("parks.title"),
  };
};

const ParksPage = async () => {
  const [{ parks }, removedParksResponse] = await Promise.all([
    apiFetch<{ parks: Park[] }>("/api/parks", {
      cache: "force-cache",
      next: {
        tags: [ADMIN_VISIBLE_PARKS_TAG],
      },
    }),
    apiFetch<{ parks: Park[] }>("/api/parks/removed", {
      cache: "force-cache",
      next: {
        tags: [ADMIN_REMOVED_PARKS_TAG],
      },
    }),
  ]);

  return <ParkManagement parks={parks} removedParks={removedParksResponse.parks} />;
};

export default ParksPage;
