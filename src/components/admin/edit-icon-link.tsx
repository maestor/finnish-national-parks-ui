"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";

interface EditIconLinkProps {
  href: string;
  label: string;
  className?: string;
  iconClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export const EditIconLink = ({
  href,
  label,
  className = "inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
  iconClassName = "h-3.5 w-3.5",
  onClick,
}: EditIconLinkProps) => {
  return (
    <Link href={href} className={className} title={label} aria-label={label} onClick={onClick}>
      <Pencil className={iconClassName} aria-hidden="true" />
    </Link>
  );
};
