import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

export const HomeMemoryHeading = ({
  id,
  title,
  href,
  archiveLabel,
  icon: Icon,
}: {
  id: string;
  title: string;
  href: string;
  archiveLabel: string;
  icon: LucideIcon;
}) => (
  <div className="mb-3 flex min-w-0 items-end justify-between gap-3">
    <h3 id={id} className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold">
      <Icon className="h-4 w-4 shrink-0 text-icon stroke-[2.25]" aria-hidden="true" />
      {title}
    </h3>
    <Link
      href={href}
      prefetch={false}
      className="ml-auto inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-control px-3.5 py-1 text-xs font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {archiveLabel}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  </div>
);
