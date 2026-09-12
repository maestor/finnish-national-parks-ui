import { getTranslations } from "next-intl/server";
import { AdminInvitationForm } from "@/components/admin/admin-invitation-form";
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
  const t = await getTranslations("controlPanel.adminUsers");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("description")}</p>
      <AdminInvitationForm />
    </div>
  );
};

export default AdminsPage;
