import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BackToStartLink } from "@/components/home/back-to-start-link";
import { cn } from "@/lib/cn";

interface HomePanelFooterProps {
  backToStartLabel: string;
  showAllAriaLabel: string;
  showAllHref: string;
  showAllLabel: string;
}

export const HomePanelFooter = ({
  backToStartLabel,
  showAllAriaLabel,
  showAllHref,
  showAllLabel,
}: HomePanelFooterProps) => (
  <div className="flex w-full flex-wrap items-center justify-between gap-2">
    <BackToStartLink label={backToStartLabel} />
    <Link
      href={showAllHref}
      prefetch={false}
      aria-label={showAllAriaLabel}
      className={cn(
        "inline-flex min-h-11 w-fit items-center justify-center gap-1.5 rounded-full border border-white/45 bg-white/76 px-3 py-2 text-xs font-medium text-foreground/78 shadow-[0_10px_22px_rgba(148,163,184,0.14)] backdrop-blur-sm transition-colors hover:bg-white/92 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/54 dark:text-sky-100/78 dark:shadow-[0_14px_28px_rgba(2,6,23,0.24)] dark:hover:bg-slate-950/72",
      )}
    >
      {showAllLabel}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  </div>
);
