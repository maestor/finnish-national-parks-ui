import { ParkList } from "@/components/parks/park-list";
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
  const t = await getTranslations("controlPanel.parks");
  const { parks } = await apiFetch<{ parks: Park[] }>("/api/parks");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <ParkList parks={parks} />
    </div>
  );
};

export default ParksPage;
