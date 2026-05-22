import { ParkExplorer } from "@/components/map/park-explorer";
import { apiFetch } from "@/lib/api";
import type { paths } from "@/lib/api-types";
import { type MapPark, mergeParksWithVisitSummaries } from "@/lib/parks";
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

type AuthUser = paths["/auth/me"]["get"]["responses"][200]["content"]["application/json"];
type VisitWithPark =
  paths["/api/visits"]["get"]["responses"][200]["content"]["application/json"]["visits"][number];

const HomePage = async () => {
  const [parksResult, visitsResult, authResult] = await Promise.allSettled([
    apiFetch<{ parks: ApiPark[] }>("/api/parks"),
    apiFetch<{ visits: VisitWithPark[] }>("/api/visits"),
    apiFetch<AuthUser>("/auth/me"),
  ]);

  let parks: MapPark[] = [];
  let error: string | null = null;
  const canManageVisits = authResult.status === "fulfilled";

  if (parksResult.status === "fulfilled") {
    parks = mergeParksWithVisitSummaries(
      parksResult.value.parks,
      visitsResult.status === "fulfilled" ? visitsResult.value.visits : [],
    );
  } else {
    const t = await getTranslations("errors.generic");
    const failure = parksResult.reason;
    error = failure instanceof Error ? failure.message : t("unknownError");
  }

  return (
    <main className="flex flex-1 flex-col min-h-0">
      <ParkExplorer parks={parks} error={error} canManageVisits={canManageVisits} />
    </main>
  );
};

export default HomePage;
