import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

interface DashboardSectionCardProps {
  title: string;
  titleId: string;
  icon: LucideIcon;
  iconClassName?: string;
  iconSurfaceClassName?: string;
  className?: string;
  children: React.ReactNode;
}

export const DashboardSectionCard = ({
  title,
  titleId,
  icon: Icon,
  iconClassName,
  iconSurfaceClassName,
  className,
  children,
}: DashboardSectionCardProps) => {
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "rounded-[2rem] border border-white/55 bg-white/66 p-5 shadow-[0_24px_60px_rgba(148,163,184,0.18)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/58 dark:border-white/10 dark:bg-slate-950/52 dark:shadow-[0_28px_64px_rgba(2,6,23,0.34)] sm:p-6",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-white/50 bg-white/72 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
            iconSurfaceClassName,
          )}
        >
          <Icon className={cn("h-4 w-4", iconClassName)} aria-hidden="true" />
        </span>
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
};
