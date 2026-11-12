"use client";

import { useSearchParams } from "next/navigation";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { StickySectionNavigation } from "@/components/navigation/sticky-section-navigation";
import { ParkVisitHistory } from "./park-visit-history";

const ParkVisitVisibilityContext = createContext<{
  visitIds: number[];
  setVisitIds: (ids: number[]) => void;
} | null>(null);

export const ParkVisitVisibilityProvider = ({
  children,
  initialVisitIds,
}: {
  children: ReactNode;
  initialVisitIds: number[];
}) => {
  const [visitIds, setVisitIds] = useState(initialVisitIds);
  useEffect(() => {
    setVisitIds(initialVisitIds);
  }, [initialVisitIds]);
  return (
    <ParkVisitVisibilityContext.Provider value={{ visitIds, setVisitIds }}>
      {children}
    </ParkVisitVisibilityContext.Provider>
  );
};

const useParkVisitVisibility = () => {
  const context = useContext(ParkVisitVisibilityContext);
  if (!context) throw new Error("Park visit visibility requires its provider");
  return context;
};

const useLinkedVisitId = () => {
  const searchParams = useSearchParams();
  const value = searchParams.get("visit");
  const visitId = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(visitId) ? visitId : null;
};

export const LinkedParkVisitHistory = (props: ComponentProps<typeof ParkVisitHistory>) => {
  const visitId = useLinkedVisitId();
  const { setVisitIds } = useParkVisitVisibility();
  return (
    <ParkVisitHistory
      key={visitId}
      {...props}
      initialOpenVisitId={visitId}
      onVisibleVisitsChange={setVisitIds}
    />
  );
};

export const LinkedParkSectionNavigation = (
  props: ComponentProps<typeof StickySectionNavigation>,
) => {
  const visitId = useLinkedVisitId();
  const { visitIds } = useParkVisitVisibility();
  const items = props.items
    .filter((item) => item.id !== "visit-history" || visitIds.length > 0)
    .map((item) =>
      item.id === "visit-history" && visitId !== null && visitIds.includes(visitId)
        ? { ...item, initialTargetId: `park-visit-${visitId}` }
        : item,
    );
  if (items.length < 2) return null;
  return <StickySectionNavigation {...props} items={items} />;
};
