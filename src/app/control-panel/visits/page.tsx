import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { VisitList } from "@/components/visits/visit-list";
import { apiFetch } from "@/lib/api";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { VisitWithPark } from "@/lib/parks";
import { appRoutes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel"),
    getTranslations("metadata"),
  ]);
  return buildPageMetadata(t("visits.title"), metadataT("title"));
};

const VisitsPage = async () => {
  const t = await getTranslations("controlPanel.visits");
  const { visits } = await apiFetch<{ visits: VisitWithPark[] }>("/api/visits");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <Link
          href={appRoutes.controlPanel.newVisit}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("addVisit")}
        </Link>
      </div>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <VisitList visits={visits} />
    </div>
  );
};

export default VisitsPage;
