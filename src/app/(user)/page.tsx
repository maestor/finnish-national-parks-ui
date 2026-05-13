import { ParkMap } from "@/components/map/park-map";
import { apiFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const t = await getTranslations("home");
  return {
    title: t("title"),
  };
};

type Park =
  paths["/api/parks"]["get"]["responses"][200]["content"]["application/json"]["parks"][number];

const HomePage = async () => {
  let parks: Park[] = [];
  let error: string | null = null;

  try {
    const data = await apiFetch<{ parks: Park[] }>("/api/parks");
    parks = data.parks;
  } catch (e) {
    const t = await getTranslations("errors.generic");
    error = e instanceof Error ? e.message : t("unknownError");
  }

  return (
    <main className="flex flex-1 flex-col min-h-0">
      <ParkMap parks={parks} error={error} />
    </main>
  );
};

export default HomePage;
