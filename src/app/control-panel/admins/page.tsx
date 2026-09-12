import { getTranslations } from "next-intl/server";
import { AdminUsersPage } from "@/components/admin/admin-users-page";
import { buildPageMetadata } from "@/lib/page-metadata";

export const dynamic = "force-dynamic";

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel.adminUsers"),
    getTranslations("metadata"),
  ]);

  return buildPageMetadata(t("title"), metadataT("title"));
};

const AdminsPage = async () => {
  return <AdminUsersPage />;
};

export default AdminsPage;
