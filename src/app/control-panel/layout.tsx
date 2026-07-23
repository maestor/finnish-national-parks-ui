import { ControlPanelNav } from "@/components/layout/control-panel-nav";

const ControlPanelLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="mx-auto flex w-full flex-1 flex-col gap-8 px-4 py-8 md:flex-row xl:px-6 2xl:px-8">
      <aside className="w-full rounded-[1.8rem] border border-white/45 bg-white/60 p-4 shadow-[0_20px_44px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/42 dark:shadow-[0_24px_48px_rgba(2,6,23,0.3)] md:w-64">
        <ControlPanelNav />
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
};

export default ControlPanelLayout;
