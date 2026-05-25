import { getTranslations } from "next-intl/server";

const ControlPanelLayout = async ({ children }: { children: React.ReactNode }) => {
  const t = await getTranslations("controlPanel");
  const navLinkClassName =
    "rounded-[1.1rem] border border-white/40 bg-white/58 px-3 py-2 text-sm font-medium text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-sm transition-colors hover:bg-white/78 dark:border-white/10 dark:bg-slate-950/42 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:bg-slate-950/62";

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-8 px-4 py-8 md:flex-row">
      <aside className="w-full rounded-[1.8rem] border border-white/45 bg-white/60 p-4 shadow-[0_20px_44px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/42 dark:shadow-[0_24px_48px_rgba(2,6,23,0.3)] md:w-64">
        <nav className="flex flex-col gap-2" aria-label={t("title")}>
          <a href="/control-panel" className={navLinkClassName}>
            {t("dashboard.title")}
          </a>
          <a href="/control-panel/parks" className={navLinkClassName}>
            {t("parks.title")}
          </a>
          <a href="/control-panel/visits" className={navLinkClassName}>
            {t("visits.title")}
          </a>
        </nav>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
};

export default ControlPanelLayout;
