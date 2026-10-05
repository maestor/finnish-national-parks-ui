"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { PUBLIC_META_BADGE_CLASS_NAME } from "./public-page-styles";

interface PublicMetaBadgeProps {
  children: ReactNode;
  label: string;
}

export const PublicMetaBadge = ({ children, label }: PublicMetaBadgeProps) => (
  <Tooltip content={label} side="top">
    {({ isOpen, tooltipId }) => (
      <button
        type="button"
        aria-describedby={isOpen ? tooltipId : undefined}
        className={`${PUBLIC_META_BADGE_CLASS_NAME} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
      >
        <span className="sr-only">{label} </span>
        {children}
      </button>
    )}
  </Tooltip>
);
