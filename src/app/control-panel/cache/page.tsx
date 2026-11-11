import { getTranslations } from "next-intl/server";
import { CacheManagement } from "@/components/admin/cache-management";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { buildPageMetadata } from "@/lib/page-metadata";
import { appRoutes } from "@/lib/routes";

export const dynamic = "force-dynamic";
export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel.cacheManagement"),
    getTranslations("metadata"),
  ]);
  return buildPageMetadata(t("title"), metadataT("title"));
};
const CachePage = () => (
  <div>
    <AppBreadcrumbs path={appRoutes.controlPanel.cache} className="mb-4" />
    <CacheManagement />
  </div>
);
export default CachePage;
