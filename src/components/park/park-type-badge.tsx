import { cn } from "@/lib/cn";

interface ParkTypeBadgeProps {
  className?: string;
  label: string;
}

export const ParkTypeBadge = ({ className, label }: ParkTypeBadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border border-border theme-memory px-2.5 py-1 text-sm leading-none font-medium text-link shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)]  dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.08)]",
      className,
    )}
  >
    {label}
  </span>
);
