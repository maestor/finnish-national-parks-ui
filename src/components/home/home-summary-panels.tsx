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
import { appRoutes } from "@/lib/routes";

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
  showAllLabel: string;
  recentVisitsShowAllAriaLabel: string;
  latestEntriesShowAllAriaLabel: string;
  mostVisitedParksShowAllAriaLabel: string;
  latestTripsShowAllAriaLabel: string;
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
  showAllLabel,
  recentVisitsShowAllAriaLabel,
  latestEntriesShowAllAriaLabel,
  mostVisitedParksShowAllAriaLabel,
  latestTripsShowAllAriaLabel,
  fallbackRecentVisits,
  fallbackLatestVisitEntries,
  fallbackMostVisitedParks,
  fallbackLatestTrips,
}: HomeSummaryPanelsProps) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <RecentVisits
      backToStartLabel={backToStartLabel}
      showAllAriaLabel={recentVisitsShowAllAriaLabel}
      showAllHref={appRoutes.visits}
      showAllLabel={showAllLabel}
      title={recentVisitsTitle}
      emptyMessage={recentVisitsEmptyMessage}
      visits={fallbackRecentVisits}
    />
    <LatestTrips
      title={latestTripsTitle}
      emptyMessage={latestTripsEmptyMessage}
      backToStartLabel={backToStartLabel}
      showAllAriaLabel={latestTripsShowAllAriaLabel}
      showAllHref={appRoutes.trips}
      showAllLabel={showAllLabel}
      trips={fallbackLatestTrips}
    />
    <LatestVisitEntries
      backToStartLabel={backToStartLabel}
      showAllAriaLabel={latestEntriesShowAllAriaLabel}
      showAllHref={appRoutes.visits}
      showAllLabel={showAllLabel}
      title={latestEntriesTitle}
      emptyMessage={latestEntriesEmptyMessage}
      visits={fallbackLatestVisitEntries}
    />
    <MostVisitedParks
      title={mostVisitedParksTitle}
      emptyMessage={mostVisitedParksEmptyMessage}
      visitCountLabel={mostVisitedParksVisitCountLabel}
      backToStartLabel={backToStartLabel}
      showAllAriaLabel={mostVisitedParksShowAllAriaLabel}
      showAllHref={appRoutes.parks}
      showAllLabel={showAllLabel}
      parks={fallbackMostVisitedParks}
    />
  </div>
);
