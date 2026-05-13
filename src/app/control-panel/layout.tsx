import { getTranslations } from "next-intl/server";

const ControlPanelLayout = async ({ children }: { children: React.ReactNode }) => {
  const t = await getTranslations("controlPanel");

  return (
    <div className="container mx-auto flex flex-1 flex-col gap-8 px-4 py-8 md:flex-row">
      <aside className="w-full md:w-64">
        <nav className="flex flex-col gap-2" aria-label={t("title")}>
          <a
            href="/control-panel"
            className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {t("dashboard.title")}
          </a>
          <a
            href="/control-panel/visits"
            className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {t("visits.title")}
          </a>
        </nav>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
};

export default ControlPanelLayout;
