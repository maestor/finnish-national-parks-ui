import { LatestVisitEntries } from "@/components/dashboard/latest-visit-entries";
import { RecentVisits } from "@/components/dashboard/recent-visits";
import type { HomeLatestVisitEntryItem, HomeRecentVisitItem } from "@/lib/frontend-summaries";

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
}: HomeActivityPanelsProps) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <RecentVisits
      title={recentVisitsTitle}
      emptyMessage={recentVisitsEmptyMessage}
      visits={fallbackRecentVisits}
    />
    <LatestVisitEntries
      title={latestEntriesTitle}
      emptyMessage={latestEntriesEmptyMessage}
      visits={fallbackLatestVisitEntries}
    />
  </div>
);
