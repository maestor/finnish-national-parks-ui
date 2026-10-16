"use client";

import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";
import { StickySectionNavigation } from "@/components/navigation/sticky-section-navigation";
import { ParkVisitHistory } from "./park-visit-history";

const useLinkedVisitId = () => {
  const searchParams = useSearchParams();
  const value = searchParams.get("visit");
  const visitId = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(visitId) ? visitId : null;
};

export const LinkedParkVisitHistory = (props: ComponentProps<typeof ParkVisitHistory>) => {
  const visitId = useLinkedVisitId();
  return <ParkVisitHistory key={visitId} {...props} initialOpenVisitId={visitId} />;
};

export const LinkedParkSectionNavigation = ({
  visitIds,
  ...props
}: ComponentProps<typeof StickySectionNavigation> & { visitIds: number[] }) => {
  const visitId = useLinkedVisitId();
  const items = props.items.map((item) =>
    item.id === "visit-history" && visitId !== null && visitIds.includes(visitId)
      ? { ...item, initialTargetId: `park-visit-${visitId}` }
      : item,
  );
  return <StickySectionNavigation {...props} items={items} />;
};
