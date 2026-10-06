import { getTranslations } from "next-intl/server";
import { AdminUsersPage } from "@/components/admin/admin-users-page";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { buildPageMetadata } from "@/lib/page-metadata";
import { appRoutes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel.adminUsers"),
    getTranslations("metadata"),
  ]);

  return buildPageMetadata(t("title"), metadataT("title"));
};

const AdminsPage = async () => {
  return (
    <div>
      <AppBreadcrumbs path={appRoutes.controlPanel.admins} className="mb-4" />
      <AdminUsersPage />
    </div>
  );
};

export default AdminsPage;
