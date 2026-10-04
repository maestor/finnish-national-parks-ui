import { ArrowUp } from "lucide-react";

interface BackToStartLinkProps {
  label: string;
}

export const BackToStartLink = ({ label }: BackToStartLinkProps) => (
  <a
    href="#home-top"
    className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-control px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-[0_10px_22px_rgba(var(--shadow-rgb),0.14)] backdrop-blur-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:shadow-[0_14px_28px_rgba(var(--shadow-rgb),0.24)]"
  >
    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
    {label}
  </a>
);
