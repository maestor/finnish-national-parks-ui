import Link from "next/link";
import { cn } from "@/lib/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: readonly BreadcrumbItem[];
  label: string;
  className?: string;
}

export const Breadcrumbs = ({ items, label, className }: BreadcrumbsProps) => {
  const currentIndex = items.length - 1;
  const mobileParentIndex = items.findLastIndex(
    (item, index) => index < currentIndex && !!item.href,
  );

  return (
    <nav aria-label={label} className={cn("text-xs leading-4 text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <li
            key={`${item.href ?? "context"}-${item.label}`}
            className={cn(
              "max-w-full min-w-0 wrap-break-word hyphens-auto",
              index < mobileParentIndex && "sr-only focus-within:not-sr-only sm:not-sr-only",
            )}
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn("mr-2", index === mobileParentIndex && "hidden sm:inline")}
              >
                ›
              </span>
            )}
            {index === currentIndex ? (
              <span aria-current="page" className="font-medium text-foreground">
                {item.label}
              </span>
            ) : item.href ? (
              <Link
                href={item.href}
                prefetch={false}
                className="-mx-1 -my-3.5 inline-block rounded-sm px-1 py-3.5 text-link hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
