"use client";

import { useTranslations } from "next-intl";

export const ParkDetailError = () => {
  const t = useTranslations("park");
  return (
    <article className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6">
      <div className="rounded-[2rem] border border-border bg-control px-6 py-5 shadow-[0_24px_48px_rgba(var(--shadow-rgb),0.16)] backdrop-blur-xl dark:shadow-[0_28px_56px_rgba(var(--shadow-rgb),0.34)]">
        <p className="text-muted-foreground">{t("detailTitle")}</p>
      </div>
    </article>
  );
};
