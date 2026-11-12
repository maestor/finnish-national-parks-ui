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
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import type { AdminParkVisits, Visit } from "@/lib/parks";
import { ParkVisitHistory } from "./park-visit-history";

const ParkVisitVisibilityContext = createContext<Visit[] | null>(null);

export const ParkVisitVisibilityProvider = ({
  children,
  parkSlug,
  initialVisits,
}: {
  children: ReactNode;
  parkSlug: string;
  initialVisits: Visit[];
}) => {
  const { isAuthenticated } = useAuth();
  const [result, setResult] = useState<{ parkSlug: string; visits: Visit[] } | null>(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    let current = true;
    void apiFetch<AdminParkVisits>(`/api/admin/parks/${encodeURIComponent(parkSlug)}/visits`, {
      cache: "no-store",
    })
      .then((response) => {
        if (current) setResult({ parkSlug, visits: response.visits });
      })
      .catch(() => {
        if (current) setResult(null);
      });
    return () => {
      current = false;
    };
  }, [isAuthenticated, parkSlug]);
  useEffect(() => {
    if (!isAuthenticated) setResult(null);
  }, [isAuthenticated]);
  const visits = isAuthenticated && result?.parkSlug === parkSlug ? result.visits : initialVisits;
  return (
    <ParkVisitVisibilityContext.Provider value={visits}>
      {children}
    </ParkVisitVisibilityContext.Provider>
  );
};

export const useParkVisitVisibility = () => useContext(ParkVisitVisibilityContext);

const useLinkedVisitId = () => {
  const searchParams = useSearchParams();
  const value = searchParams.get("visit");
  const visitId = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(visitId) ? visitId : null;
};

export const LinkedParkVisitHistory = (props: ComponentProps<typeof ParkVisitHistory>) => {
  const visitId = useLinkedVisitId();
  const visits = useParkVisitVisibility() ?? props.visits;
  return <ParkVisitHistory {...props} initialOpenVisitId={visitId} visits={visits} />;
};

export const LinkedParkSectionNavigation = (
  props: ComponentProps<typeof StickySectionNavigation>,
) => {
  const visitId = useLinkedVisitId();
  const visitIds = (useParkVisitVisibility() ?? []).map((visit) => visit.id);
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
