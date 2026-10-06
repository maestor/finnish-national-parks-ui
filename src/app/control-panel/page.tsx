import { getTranslations } from "next-intl/server";
import {
  type HomeFeaturedParkSelection,
  HomeFeaturedParkSettings,
} from "@/components/dashboard/home-featured-park-settings";
import {
  type HomeFeaturedVisitSelection,
  HomeFeaturedVisitSettings,
} from "@/components/dashboard/home-featured-visit-settings";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { apiAuthFetch } from "@/lib/api";
import { buildPageMetadata } from "@/lib/page-metadata";
import { appRoutes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel"),
    getTranslations("metadata"),
  ]);
  return buildPageMetadata(t("title"), metadataT("title"));
};

const ControlPanelPage = async () => {
  const t = await getTranslations("controlPanel.dashboard");
  const [selection, parkSelection] = await Promise.all([
    apiAuthFetch<HomeFeaturedVisitSelection>("/api/admin/home-featured-visit", {
      cache: "no-store",
    }),
    apiAuthFetch<HomeFeaturedParkSelection>("/api/admin/home-featured-park", { cache: "no-store" }),
  ]);

  return (
    <div className="max-w-2xl xl:max-w-none">
      <AppBreadcrumbs path={appRoutes.controlPanel.root} className="mb-4" />
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
        <HomeFeaturedVisitSettings initialSelection={selection} />
        <HomeFeaturedParkSettings initialSelection={parkSelection} />
      </div>
    </div>
  );
};

export default ControlPanelPage;
