"use client";

import { LatestVisitEntries } from "@/components/dashboard/latest-visit-entries";
import { RecentVisits } from "@/components/dashboard/recent-visits";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import type { VisitWithPark } from "@/lib/parks";
import {
  type HomeLatestVisitEntryItem,
  type HomeRecentVisitItem,
  createHomeLatestVisitEntriesFromVisitList,
  createHomeRecentVisitsFromVisitList,
} from "@/lib/public-summaries";
import { useEffect, useState } from "react";

interface HomeActivityPanelsProps {
  recentVisitsTitle: string;
  recentVisitsEmptyMessage: string;
  latestEntriesTitle: string;
  latestEntriesEmptyMessage: string;
  fallbackRecentVisits: HomeRecentVisitItem[];
  fallbackLatestVisitEntries: HomeLatestVisitEntryItem[];
}

export const HomeActivityPanels = ({
  recentVisitsTitle,
  recentVisitsEmptyMessage,
  latestEntriesTitle,
  latestEntriesEmptyMessage,
  fallbackRecentVisits,
  fallbackLatestVisitEntries,
}: HomeActivityPanelsProps) => {
  const auth = useAuth();
  const [adminRecentVisits, setAdminRecentVisits] = useState<HomeRecentVisitItem[] | null>(null);
  const [adminLatestVisitEntries, setAdminLatestVisitEntries] = useState<
    HomeLatestVisitEntryItem[] | null
  >(null);

  useEffect(() => {
    let mounted = true;

    if (!auth.isAuthenticated) {
      setAdminRecentVisits(null);
      setAdminLatestVisitEntries(null);
      return () => {
        mounted = false;
      };
    }

    apiFetch<{ visits: VisitWithPark[] }>("/api/visits")
      .then(({ visits }) => {
        if (!mounted) {
          return;
        }

        setAdminRecentVisits(createHomeRecentVisitsFromVisitList(visits));
        setAdminLatestVisitEntries(createHomeLatestVisitEntriesFromVisitList(visits));
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setAdminRecentVisits(null);
        setAdminLatestVisitEntries(null);
      });

    return () => {
      mounted = false;
    };
  }, [auth.isAuthenticated]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <RecentVisits
        title={recentVisitsTitle}
        emptyMessage={recentVisitsEmptyMessage}
        visits={adminRecentVisits ?? fallbackRecentVisits}
        showEditLinks={auth.isAuthenticated && adminRecentVisits !== null}
      />
      <LatestVisitEntries
        title={latestEntriesTitle}
        emptyMessage={latestEntriesEmptyMessage}
        visits={adminLatestVisitEntries ?? fallbackLatestVisitEntries}
        showEditLinks={auth.isAuthenticated}
      />
    </div>
  );
};
