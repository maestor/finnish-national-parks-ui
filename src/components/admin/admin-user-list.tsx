"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  type AdminUser,
  listAdminUsers,
  removeAdminUser,
  updateAdminUser,
} from "@/lib/admin-users";
import { ApiError } from "@/lib/api";

export const AdminUserList = () => {
  const t = useTranslations("controlPanel.adminUsers");
  const listError = t("errors.list");
  const auth = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyAdminId, setBusyAdminId] = useState<number | null>(null);

  useEffect(() => {
    if (auth.isLoading || auth.user?.isSuperAdmin !== true) {
      return;
    }

    let mounted = true;
    void listAdminUsers()
      .then((response) => {
        if (mounted) {
          setAdmins(response.admins);
        }
      })
      .catch(() => {
        if (mounted) {
          setError(listError);
        }
      });

    return () => {
      mounted = false;
    };
  }, [auth.isLoading, auth.user?.isSuperAdmin, listError]);

  const getActionError = (caughtError: unknown, action: "remove" | "update") => {
    if (
      caughtError instanceof ApiError &&
      (caughtError.status === 401 || caughtError.status === 403)
    ) {
      return t("errors.notAllowed");
    }

    return t(`errors.${action}`);
  };

  const handleRoleChange = async (admin: AdminUser) => {
    setBusyAdminId(admin.id);
    setError(null);

    try {
      const updatedAdmin = await updateAdminUser(admin.id, { isSuperAdmin: !admin.isSuperAdmin });
      setAdmins((currentAdmins) =>
        currentAdmins.map((currentAdmin) =>
          currentAdmin.id === updatedAdmin.id ? updatedAdmin : currentAdmin,
        ),
      );
    } catch (caughtError) {
      setError(getActionError(caughtError, "update"));
    } finally {
      setBusyAdminId(null);
    }
  };

  const handleRemove = async (admin: AdminUser) => {
    if (!window.confirm(t("confirmRemove", { email: admin.email }))) {
      return;
    }

    setBusyAdminId(admin.id);
    setError(null);

    try {
      await removeAdminUser(admin.id);
      setAdmins((currentAdmins) =>
        currentAdmins.filter((currentAdmin) => currentAdmin.id !== admin.id),
      );
    } catch (caughtError) {
      setError(getActionError(caughtError, "remove"));
    } finally {
      setBusyAdminId(null);
    }
  };

  const currentUserEmail = auth.user?.email.trim().toLowerCase() ?? "";

  return (
    <section
      aria-labelledby="admin-user-list-title"
      className="mt-8 max-w-4xl space-y-4 rounded-3xl border border-white/45 bg-white/70 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/56 dark:shadow-[0_24px_52px_rgba(2,6,23,0.28)]"
    >
      <div>
        <h2 id="admin-user-list-title" className="text-lg font-semibold">
          {t("listTitle")}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("listDescription")}</p>
      </div>

      {error !== null && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-168 text-left text-sm">
          <thead className="border-b border-border/70 text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-3 font-medium">
                {t("emailColumn")}
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                {t("roleColumn")}
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                {t("statusColumn")}
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                <span className="sr-only">{t("actionsColumn")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => {
              const isCurrentUser = admin.email === currentUserEmail;
              const isBusy = busyAdminId === admin.id;

              return (
                <tr key={admin.id} className="border-b border-border/50 last:border-0">
                  <th scope="row" className="px-3 py-4 font-medium">
                    <span>{admin.email}</span>
                    {isCurrentUser && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({t("currentUser")})
                      </span>
                    )}
                  </th>
                  <td className="px-3 py-4">
                    {admin.isSuperAdmin ? t("superAdminRole") : t("adminRole")}
                  </td>
                  <td className="px-3 py-4 text-muted-foreground">
                    {admin.isEnrolled ? t("enrolled") : t("notEnrolled")}
                  </td>
                  <td className="px-3 py-4">
                    {!isCurrentUser && (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            void handleRoleChange(admin);
                          }}
                          className="min-h-10 rounded-md border border-border/80 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                        >
                          {admin.isSuperAdmin ? t("reduce") : t("upgrade")}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            void handleRemove(admin);
                          }}
                          className="min-h-10 rounded-md border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                        >
                          {t("remove")}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
