import { cn } from "@/lib/cn";

interface ParkTypeBadgeProps {
  className?: string;
  label: string;
}

export const ParkTypeBadge = ({ className, label }: ParkTypeBadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border border-emerald-200/60 bg-[linear-gradient(145deg,rgba(22,101,52,0.12),rgba(37,99,235,0.12))] px-2.5 py-1 text-sm leading-none font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-emerald-300/15 dark:bg-[linear-gradient(145deg,rgba(22,101,52,0.22),rgba(37,99,235,0.2))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
      className,
    )}
  >
    {label}
  </span>
);
