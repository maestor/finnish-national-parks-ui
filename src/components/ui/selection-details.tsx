import type { ReactNode } from "react";
import { PANEL_SURFACE_CLASS_NAME } from "./theme-styles";

export const SelectionDetails = ({
  label,
  labelAction,
  children,
  actions,
}: {
  label: string;
  labelAction?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) => (
  <div
    data-testid="selection-details"
    className={`${PANEL_SURFACE_CLASS_NAME} mt-4 flex flex-col items-start gap-3 rounded-2xl p-4 md:flex-row md:items-stretch md:justify-between`}
  >
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {labelAction}
      </div>
      {children}
    </div>
    {actions}
  </div>
);
