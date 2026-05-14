"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface EditVisitLinkProps {
  visitId: number;
  className?: string;
  iconClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export const EditVisitLink = ({
  visitId,
  className = "inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
  iconClassName = "h-3.5 w-3.5",
  onClick,
}: EditVisitLinkProps) => {
  const t = useTranslations("controlPanel.visits");

  return (
    <Link
      href={`/control-panel/visits/${visitId}/edit`}
      className={className}
      title={t("edit")}
      aria-label={t("edit")}
      onClick={onClick}
    >
      <Pencil className={iconClassName} />
    </Link>
  );
};
