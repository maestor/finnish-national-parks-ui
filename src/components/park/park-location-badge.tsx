import { MapPin, Route } from "lucide-react";
import type { ReactNode } from "react";
import { PUBLIC_META_BADGE_CLASS_NAME } from "@/components/layout/public-page-styles";

export const ParkLocationBadge = ({
  kind,
  children,
}: {
  kind: "address" | "trail";
  children: ReactNode;
}) => (
  <span className={`${PUBLIC_META_BADGE_CLASS_NAME} max-w-full`}>
    {kind === "address" ? (
      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    ) : (
      <Route className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    )}
    {children}
  </span>
);
