"use client";

import { useTranslations } from "next-intl";
import { EditIconLink } from "@/components/admin/edit-icon-link";
import { appRoutes } from "@/lib/routes";

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
    <EditIconLink
      href={appRoutes.controlPanel.editVisit(visitId)}
      label={t("edit")}
      className={className}
      iconClassName={iconClassName}
      onClick={onClick}
    />
  );
};
