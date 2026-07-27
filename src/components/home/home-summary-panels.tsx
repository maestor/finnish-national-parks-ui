import { LatestTrips } from "@/components/dashboard/latest-trips";
import { LatestVisitEntries } from "@/components/dashboard/latest-visit-entries";
import { MostVisitedParks } from "@/components/dashboard/most-visited-parks";
import { RecentVisits } from "@/components/dashboard/recent-visits";
import type {
  HomeLatestTripItem,
  HomeLatestVisitEntryItem,
  HomeMostVisitedPark,
  HomeRecentVisitItem,
} from "@/lib/frontend-summaries";

interface HomeSummaryPanelsProps {
  recentVisitsTitle: string;
  recentVisitsEmptyMessage: string;
  latestEntriesTitle: string;
  latestEntriesEmptyMessage: string;
  mostVisitedParksTitle: string;
  mostVisitedParksEmptyMessage: string;
  mostVisitedParksVisitCountLabel: string;
  latestTripsTitle: string;
  latestTripsEmptyMessage: string;
  backToStartLabel: string;
  fallbackRecentVisits: HomeRecentVisitItem[];
  fallbackLatestVisitEntries: HomeLatestVisitEntryItem[];
  fallbackMostVisitedParks: HomeMostVisitedPark[];
  fallbackLatestTrips: HomeLatestTripItem[];
}

export const HomeSummaryPanels = ({
  recentVisitsTitle,
  recentVisitsEmptyMessage,
  latestEntriesTitle,
  latestEntriesEmptyMessage,
  mostVisitedParksTitle,
  mostVisitedParksEmptyMessage,
  mostVisitedParksVisitCountLabel,
  latestTripsTitle,
  latestTripsEmptyMessage,
  backToStartLabel,
  fallbackRecentVisits,
  fallbackLatestVisitEntries,
  fallbackMostVisitedParks,
  fallbackLatestTrips,
}: HomeSummaryPanelsProps) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <RecentVisits
      backToStartLabel={backToStartLabel}
      title={recentVisitsTitle}
      emptyMessage={recentVisitsEmptyMessage}
      visits={fallbackRecentVisits}
    />
    <LatestTrips
      title={latestTripsTitle}
      emptyMessage={latestTripsEmptyMessage}
      backToStartLabel={backToStartLabel}
      trips={fallbackLatestTrips}
    />
    <LatestVisitEntries
      backToStartLabel={backToStartLabel}
      title={latestEntriesTitle}
      emptyMessage={latestEntriesEmptyMessage}
      visits={fallbackLatestVisitEntries}
    />
    <MostVisitedParks
      title={mostVisitedParksTitle}
      emptyMessage={mostVisitedParksEmptyMessage}
      visitCountLabel={mostVisitedParksVisitCountLabel}
      backToStartLabel={backToStartLabel}
      parks={fallbackMostVisitedParks}
    />
  </div>
);
