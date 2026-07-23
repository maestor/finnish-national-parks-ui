import { ArrowUp } from "lucide-react";

interface BackToStartLinkProps {
  label: string;
}

export const BackToStartLink = ({ label }: BackToStartLinkProps) => (
  <a
    href="#home-top"
    className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/45 bg-white/76 px-3 py-1.5 text-xs font-medium text-foreground/78 shadow-[0_10px_22px_rgba(148,163,184,0.14)] backdrop-blur-sm transition-colors hover:bg-white/92 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/54 dark:text-sky-100/78 dark:shadow-[0_14px_28px_rgba(2,6,23,0.24)] dark:hover:bg-slate-950/72"
  >
    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
    {label}
  </a>
);
