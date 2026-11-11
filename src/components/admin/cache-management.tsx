"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const scopes = ["home", "map", "visits", "parks", "trips", "all"] as const;
type Scope = (typeof scopes)[number];

export const CacheManagement = () => {
  const t = useTranslations("controlPanel.cacheManagement");
  const auth = useAuth();
  const [pending, setPending] = useState<Scope | null>(null);
  const [result, setResult] = useState<{ scope: Scope; ok: boolean } | null>(null);

  if (auth.isLoading) return <p role="status">{t("loading")}</p>;
  if (auth.user?.isSuperAdmin !== true)
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("notAllowed")}
      </p>
    );

  const refresh = async (scope: Scope) => {
    setPending(scope);
    setResult(null);
    try {
      const response = await fetch("/api/admin/cache", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      setResult({ scope, ok: response.ok });
    } catch {
      setResult({ scope, ok: false });
    } finally {
      setPending(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("description")}</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {scopes.map((scope) => (
          <section key={scope} className="rounded-2xl border border-border theme-panel p-5">
            <h2 className="font-semibold">{t(`${scope}.title`)}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t(`${scope}.description`)}</p>
            <Button
              className="mt-4"
              type="button"
              disabled={pending !== null}
              onClick={() => refresh(scope)}
            >
              {pending === scope ? t("refreshing") : t(`${scope}.button`)}
            </Button>
            {result?.scope === scope && (
              <p
                className={`mt-3 text-sm ${result.ok ? "text-foreground" : "text-destructive"}`}
                role={result.ok ? "status" : "alert"}
              >
                {result.ok ? t("success") : t("error")}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};
