import { ParkManagement } from "@/components/parks/park-management";
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
    apiFetch<{ parks: Park[] }>("/api/parks"),
    apiFetch<{ parks: Park[] }>("/api/parks/removed"),
  ]);

  return <ParkManagement parks={parks} removedParks={removedParksResponse.parks} />;
};

export default ParksPage;
