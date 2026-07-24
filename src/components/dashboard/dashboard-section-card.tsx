import type { LucideIcon } from "lucide-react";
import {
  PUBLIC_PANEL_CLASS_NAME,
  PUBLIC_PANEL_ICON_SURFACE_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { cn } from "@/lib/cn";

interface DashboardSectionCardProps {
  title: string;
  titleId: string;
  icon: LucideIcon;
  iconClassName?: string;
  iconSurfaceClassName?: string;
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const DashboardSectionCard = ({
  title,
  titleId,
  icon: Icon,
  iconClassName,
  iconSurfaceClassName,
  className,
  children,
  footer,
}: DashboardSectionCardProps) => {
  return (
    <section aria-labelledby={titleId} className={cn(PUBLIC_PANEL_CLASS_NAME, className)}>
      <div className="flex items-center gap-3">
        <span className={cn(PUBLIC_PANEL_ICON_SURFACE_CLASS_NAME, iconSurfaceClassName)}>
          <Icon className={cn("h-4 w-4", iconClassName)} aria-hidden="true" />
        </span>
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
      </div>
      <div className="mt-5">{children}</div>
      {footer != null && <div className="mt-5">{footer}</div>}
    </section>
  );
};
