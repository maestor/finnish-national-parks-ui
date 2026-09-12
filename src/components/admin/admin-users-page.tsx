"use client";

import { useTranslations } from "next-intl";
import { AdminInvitationForm } from "@/components/admin/admin-invitation-form";
import { AdminUserList } from "@/components/admin/admin-user-list";
import { useAuth } from "@/hooks/use-auth";

export const AdminUsersPage = () => {
  const t = useTranslations("controlPanel.adminUsers");
  const auth = useAuth();

  if (auth.isLoading) {
    return <p role="status">{t("loading")}</p>;
  }

  if (auth.user?.isSuperAdmin !== true) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("errors.notAllowed")}
      </p>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("description")}</p>
      <AdminInvitationForm />
      <AdminUserList />
    </div>
  );
};
