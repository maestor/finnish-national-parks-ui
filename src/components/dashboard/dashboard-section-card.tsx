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
        "rounded-3xl border border-border/80 bg-muted/35 p-5 shadow-sm dark:bg-card sm:p-6",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background text-foreground shadow-sm dark:bg-background/80",
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
