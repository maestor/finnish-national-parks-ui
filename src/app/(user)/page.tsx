import { ParkExplorer } from "@/components/map/park-explorer";
import { apiFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";
import type { MapPark } from "@/lib/parks";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const t = await getTranslations("home");
  return {
    title: t("title"),
  };
};

type ApiPark =
  paths["/api/parks"]["get"]["responses"][200]["content"]["application/json"]["parks"][number];

type ApiPersonalPark =
  paths["/api/me/parks"]["get"]["responses"][200]["content"]["application/json"]["parks"][number];

const HomePage = async () => {
  let parks: MapPark[] = [];
  let error: string | null = null;
  let isAuthenticated = false;

  try {
    const data = await apiFetch<{ parks: ApiPersonalPark[] }>("/api/me/parks");
    parks = data.parks;
    isAuthenticated = true;
  } catch (_e) {
    try {
      const data = await apiFetch<{ parks: ApiPark[] }>("/api/parks");
      parks = data.parks.map((park) => ({
        ...park,
        visitedSummary: { visited: false },
      }));
    } catch (fallbackErr) {
      const t = await getTranslations("errors.generic");
      error = fallbackErr instanceof Error ? fallbackErr.message : t("unknownError");
    }
  }

  return (
    <main className="flex flex-1 flex-col min-h-0">
      <ParkExplorer parks={parks} error={error} isAuthenticated={isAuthenticated} />
    </main>
  );
};

export default HomePage;
