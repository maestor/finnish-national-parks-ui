import { apiAuthFetch, apiFetch, apiPublicFetch } from "@/lib/api";
import type { AdminVisibilityPark, Park, Visit, VisitWithPark } from "@/lib/parks";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserLayout from "./(user)/layout";
import HomePage, { generateMetadata as generateHomeMetadata } from "./(user)/page";
import ParkDetailPage, {
  generateMetadata as generateParkDetailMetadata,
} from "./(user)/park/[slug]/page";
import ParksMapPage, { generateMetadata as generateParksMapMetadata } from "./(user)/parks/page";
import PublicVisitsPage, {
  generateMetadata as generatePublicVisitsMetadata,
} from "./(user)/visits/page";
import ControlPanelLayout from "./control-panel/layout";
import ControlPanelPage, {
  generateMetadata as generateControlPanelMetadata,
} from "./control-panel/page";
import EditParkPage, {
  generateMetadata as generateEditParkMetadata,
} from "./control-panel/parks/[slug]/edit/page";
import ParksPage, { generateMetadata as generateParksMetadata } from "./control-panel/parks/page";
import EditVisitPage, {
  generateMetadata as generateEditVisitMetadata,
} from "./control-panel/visits/[id]/edit/page";
import NewVisitPage, {
  generateMetadata as generateNewVisitMetadata,
} from "./control-panel/visits/new/page";
import VisitsPage, {
  generateMetadata as generateVisitsMetadata,
} from "./control-panel/visits/page";
import LoginPage from "./login/page";
import NotFoundPage from "./not-found";
import OfflinePage from "./~offline/page";

const { mockNotFound } = vi.hoisted(() => ({
  mockNotFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/api", () => ({
  apiAuthFetch: vi.fn(),
  apiFetch: vi.fn(),
  apiPublicFetch: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace?: string) => {
    return (key: string) => (namespace ? `${namespace}.${key}` : key);
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
  notFound: mockNotFound,
}));

vi.mock("@/components/map/park-explorer", () => ({
  ParkExplorer: ({
    parks,
    error,
  }: {
    parks: Park[];
    error?: string | null;
  }) => (
    <div data-testid="park-explorer">
      parks:{parks.length}|error:{error ?? "none"}
    </div>
  ),
}));

vi.mock("@/components/map/park-boundary-map", () => ({
  ParkBoundaryMap: ({ parkName }: { parkName: string }) => (
    <div data-testid="park-boundary-map">{parkName}</div>
  ),
}));

vi.mock("@/components/park/visit-accordion", () => ({
  VisitAccordion: ({ visits, isEditable }: { visits: { id: number }[]; isEditable?: boolean }) => (
    <div data-testid="visit-accordion">
      visits:{visits.length}|editable:{String(isEditable)}
    </div>
  ),
}));

vi.mock("@/components/park/park-visit-history", () => ({
  ParkVisitHistory: ({
    parkSlug,
    visits,
    initialOpenVisitId,
  }: {
    parkSlug: string;
    visits: { id: number }[];
    initialOpenVisitId?: number | null;
  }) => (
    <div data-testid="park-visit-history">
      slug:{parkSlug}|visits:{visits.length}|open:{initialOpenVisitId ?? "none"}
    </div>
  ),
}));

vi.mock("@/components/park/park-admin-controls", () => ({
  ParkAdminControlsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ParkVisibilityBadge: () => null,
  ParkAdminSection: () => null,
}));

vi.mock("@/components/visits/public-visits-timeline", () => ({
  PublicVisitsTimeline: ({
    visits,
    selectedYear,
    selectedMonth,
    error,
  }: {
    visits: VisitWithPark[];
    selectedYear: number | null;
    selectedMonth: number | null;
    error?: string | null;
  }) => (
    <div data-testid="public-visits-timeline">
      visits:{visits.length}|year:{selectedYear ?? "all"}|month:{selectedMonth ?? "all"}|error:
      {error ?? "none"}
    </div>
  ),
}));

vi.mock("@/components/dashboard/home-visit-stats", () => ({
  HomeVisitStats: ({
    totalVisits,
    progressItems,
  }: {
    totalVisits: number;
    progressItems: { label: string; visited: number; total: number }[];
  }) => (
    <div data-testid="home-visit-stats">
      total:{totalVisits}|items:{progressItems.length}|first:{progressItems[0]?.label ?? "none"}
    </div>
  ),
}));

vi.mock("@/components/dashboard/most-visited-parks", () => ({
  MostVisitedParks: ({
    parks,
  }: {
    parks: { parkName: string; parkSlug: string; visitCount: number }[];
  }) => (
    <div data-testid="most-visited-parks">
      parks:{parks.length}|top:{parks[0] ? `${parks[0].parkName}:${parks[0].visitCount}` : "none"}
    </div>
  ),
}));

vi.mock("@/components/dashboard/recent-visits", () => ({
  RecentVisits: ({
    visits,
    showEditLinks,
  }: {
    visits: { id?: number; parkName: string; parkSlug: string; visitedOn: string | null }[];
    showEditLinks?: boolean;
  }) => (
    <div data-testid="recent-visits">
      visits:{visits.length}|edit:{String(showEditLinks)}
    </div>
  ),
}));

vi.mock("@/components/dashboard/latest-visit-entries", () => ({
  LatestVisitEntries: ({
    visits,
    showEditLinks,
  }: {
    visits: { id?: number; parkName: string; parkSlug: string; createdAt: string }[];
    showEditLinks?: boolean;
  }) => (
    <div data-testid="latest-visit-entries">
      visits:{visits.length}|edit:{String(showEditLinks)}
    </div>
  ),
}));

vi.mock("@/components/home/home-activity-panels", () => ({
  HomeActivityPanels: ({
    fallbackRecentVisits,
    fallbackLatestVisitEntries,
  }: {
    fallbackRecentVisits: { parkName: string }[];
    fallbackLatestVisitEntries: { parkName: string }[];
  }) => (
    <div data-testid="home-activity-panels">
      recent:{fallbackRecentVisits.length}|latest:{fallbackLatestVisitEntries.length}
    </div>
  ),
}));

vi.mock("@/components/home/home-intro", () => ({
  HomeIntro: ({
    title,
    summary,
    openMapLabel,
    infoClosedLabel,
  }: {
    title: string;
    summary: string;
    openMapLabel: string;
    infoClosedLabel: string;
  }) => (
    <div data-testid="home-intro">
      title:{title}|summary:{summary}|map:{openMapLabel}|info:{infoClosedLabel}
    </div>
  ),
}));

vi.mock("@/components/visits/visit-list", () => ({
  VisitList: ({ visits }: { visits: VisitWithPark[] }) => (
    <div data-testid="visit-list">visits:{visits.length}</div>
  ),
}));

vi.mock("@/components/parks/park-list", () => ({
  ParkList: ({
    parks,
    removedParks,
  }: {
    parks: AdminVisibilityPark[];
    removedParks: AdminVisibilityPark[];
  }) => (
    <div data-testid="park-list">
      parks:{parks.length}|removed:{removedParks.length}
    </div>
  ),
}));

vi.mock("@/components/parks/park-management", () => ({
  ParkManagement: ({
    parks,
    removedParks,
  }: {
    parks: AdminVisibilityPark[];
    removedParks: AdminVisibilityPark[];
  }) => (
    <div data-testid="park-management">
      parks:{parks.length}|removed:{removedParks.length}
    </div>
  ),
}));

vi.mock("@/components/parks/park-form", () => ({
  ParkForm: ({ park }: { park: { slug: string; name: string } }) => (
    <div data-testid="park-form">
      slug:{park.slug}|name:{park.name}
    </div>
  ),
}));

vi.mock("@/components/visits/visit-form", () => ({
  VisitForm: ({
    parks,
    visitToEdit,
    defaultParkSlug,
  }: {
    parks: Park[];
    visitToEdit?: { id: number } | undefined;
    defaultParkSlug?: string;
  }) => (
    <div data-testid="visit-form">
      parks:{parks.length}|edit:{visitToEdit?.id ?? "new"}|default:{defaultParkSlug ?? "none"}
    </div>
  ),
}));

vi.mock("@/components/visits/visit-image-section", () => ({
  VisitImageSection: ({ visitId, images }: { visitId: number; images: { id: number }[] }) => (
    <div data-testid="visit-image-section">
      visit:{visitId}|images:{images.length}
    </div>
  ),
}));

vi.mock("@/components/auth/post-login-return-redirector", () => ({
  PostLoginReturnRedirector: () => <div data-testid="post-login-return-redirector" />,
}));

const publicPark = {
  slug: "pallas",
  name: "Pallas-Yllästunturi",
  areaKm2: 14,
  displayTypeName: "Maailmanperintökohde",
  location: "Lappi",
  logo: null,
  luontoonUrl: "https://example.com/pallas",
  map: null,
  establishmentYear: 1938,
  boundingBox: { minLat: 67, minLon: 23, maxLat: 68, maxLon: 25 },
  markerPoint: { lat: 67.5, lon: 24 },
  category: { name: "Kansallispuistot", slug: "national-park" },
  type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
} as Park;

const adminVisibilityPark = {
  slug: "pallas",
  name: "Pallas-Yllästunturi",
  displayTypeName: "Maailmanperintökohde",
  location: "Lappi",
  boundingBox: { minLat: 67, minLon: 23, maxLat: 68, maxLon: 25 },
  markerPoint: { lat: 67.5, lon: 24 },
  type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
} as AdminVisibilityPark;

const personalVisit = {
  id: 10,
  visitedOn: "2024-06-15",
  route: "Huippupolku",
  author: "Maija",
  note: "Aurinkoinen reissu",
  createdAt: "2024-06-15T10:00:00Z",
  updatedAt: "2024-06-15T10:00:00Z",
  images: [
    {
      id: 1,
      fullUrl: "https://example.com/full.jpg",
      thumbUrl: "https://example.com/thumb.jpg",
      fullWidth: 1200,
      fullHeight: 800,
      thumbWidth: 400,
      thumbHeight: 267,
      originalName: "kuva.jpg",
      displayOrder: 0,
      createdAt: "2024-06-15T10:00:00Z",
    },
  ],
} satisfies Visit;

const visitWithPark = {
  ...personalVisit,
  park: {
    name: publicPark.name,
    slug: publicPark.slug,
  },
} satisfies VisitWithPark;

const renderPublicRoute = async (page: React.ReactNode) => {
  render(UserLayout({ children: page }));
};

const renderControlPanelRoute = async (page: React.ReactNode) => {
  render(await ControlPanelLayout({ children: page }));
};

describe("App pages", () => {
  beforeEach(() => {
    vi.mocked(apiAuthFetch).mockReset();
    vi.mocked(apiFetch).mockReset();
    vi.mocked(apiPublicFetch).mockReset();
    mockNotFound.mockReset();
    mockNotFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  it("renders the root page with visit statistics and authenticated edit affordances", async () => {
    vi.mocked(apiPublicFetch).mockResolvedValueOnce({
      totalVisits: 1,
      uniqueVisitedParks: 1,
      progressByType: [
        {
          totalParks: 1,
          totalVisits: 1,
          type: publicPark.type,
          visible: true,
          visitedParks: 1,
        },
      ],
      progressByCategory: [
        {
          category: publicPark.category,
          totalParks: 1,
          totalVisits: 1,
          visitedParks: 1,
        },
      ],
      mostVisitedParks: [
        {
          lastVisitedOn: "2024-06-15",
          park: visitWithPark.park,
          visitCount: 1,
        },
      ],
      recentVisits: [
        {
          park: visitWithPark.park,
          visitedSummary: {
            visited: true,
            visitCount: 1,
            lastVisitedOn: "2024-06-15",
          },
        },
      ],
      latestVisitEntries: [
        {
          id: visitWithPark.id,
          park: visitWithPark.park,
          visitedOn: visitWithPark.visitedOn,
          createdAt: visitWithPark.createdAt,
          updatedAt: visitWithPark.updatedAt,
        },
      ],
      updatedAt: visitWithPark.updatedAt,
      version: 3,
    });

    await renderPublicRoute(await HomePage());

    expect(screen.getByTestId("home-intro")).toHaveTextContent(
      "title:home.title|summary:home.summary|map:home.openMap|info:home.intro.showInfo",
    );
    expect(screen.getByTestId("home-visit-stats")).toHaveTextContent(
      "total:1|items:2|first:home.statistics.allParks",
    );
    expect(screen.getByTestId("most-visited-parks")).toHaveTextContent(
      "parks:1|top:Pallas-Yllästunturi:1",
    );
    expect(screen.getByTestId("home-activity-panels")).toHaveTextContent("recent:1|latest:1");
  });

  it("renders the parks map page from the public summary endpoint", async () => {
    vi.mocked(apiPublicFetch).mockResolvedValueOnce({
      parks: [
        {
          ...publicPark,
          visitedSummary: {
            visited: true,
            visitCount: 1,
            lastVisitedOn: "2024-06-15",
          },
        },
      ],
      updatedAt: visitWithPark.updatedAt,
      version: 4,
    });

    await renderPublicRoute(await ParksMapPage());

    expect(screen.getByTestId("park-explorer")).toHaveTextContent("parks:1|error:none");
  });

  it("shows the fallback error message when the public map summary request fails", async () => {
    vi.mocked(apiPublicFetch).mockRejectedValueOnce(new Error("backend offline"));

    await renderPublicRoute(await ParksMapPage());

    expect(screen.getByTestId("park-explorer")).toHaveTextContent("parks:0|error:backend offline");
  });

  it("builds translated metadata for the home page", async () => {
    await expect(generateHomeMetadata()).resolves.toEqual({
      title: "home.title",
    });
  });

  it("builds translated metadata for the parks map page", async () => {
    await expect(generateParksMapMetadata()).resolves.toEqual({
      title: "home.mapTitle",
    });
  });

  it("renders the park detail page with main content and visit history", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ...publicPark,
        boundaryGeoJson: { type: "FeatureCollection", features: [] },
      })
      .mockResolvedValueOnce({
        visitedSummary: {
          visited: true,
          visitCount: 1,
          lastVisitedOn: "2024-06-15",
        },
        visits: [personalVisit],
      });

    await renderPublicRoute(
      await ParkDetailPage({
        params: Promise.resolve({ slug: "pallas" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("heading", { name: "Pallas-Yllästunturi" })).toBeInTheDocument();
    expect(screen.getByText("Maailmanperintökohde")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "park.showInFinlandsMap" })).toHaveAttribute(
      "href",
      "/parks?park=pallas",
    );
    expect(screen.getByTestId("park-boundary-map")).toHaveTextContent("Pallas-Yllästunturi");
    expect(screen.getByTestId("park-visit-history")).toHaveTextContent(
      "slug:pallas|visits:1|open:none",
    );
  });

  it("passes a targeted visit id to the park detail visit history", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ...publicPark,
        boundaryGeoJson: null,
      })
      .mockResolvedValueOnce({
        visitedSummary: {
          visited: true,
          visitCount: 1,
          lastVisitedOn: "2024-06-15",
        },
        visits: [personalVisit],
      });

    await renderPublicRoute(
      await ParkDetailPage({
        params: Promise.resolve({ slug: "pallas" }),
        searchParams: Promise.resolve({ visit: "10" }),
      }),
    );

    expect(screen.getByTestId("park-visit-history")).toHaveTextContent(
      "slug:pallas|visits:1|open:10",
    );
  });

  it("renders the park logo when present", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ...publicPark,
        logo: {
          key: "pallas-logo.png",
          updatedAt: "2024-01-01T00:00:00Z",
          url: "https://example.com/pallas-logo.png",
        },
        boundaryGeoJson: null,
      })
      .mockResolvedValueOnce({
        visitedSummary: {
          visited: false,
          visitCount: 0,
          lastVisitedOn: null,
        },
        visits: [],
      });

    await renderPublicRoute(
      await ParkDetailPage({
        params: Promise.resolve({ slug: "pallas" }),
        searchParams: Promise.resolve({}),
      }),
    );

    const logo = screen.getByRole("img", { name: "Pallas-Yllästunturi" });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "https://example.com/pallas-logo.png");
    expect(logo).toHaveClass("h-28", "w-auto");
  });

  it("does not render a logo when the park has no logo", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ...publicPark,
        boundaryGeoJson: null,
      })
      .mockResolvedValueOnce({
        visitedSummary: {
          visited: false,
          visitCount: 0,
          lastVisitedOn: null,
        },
        visits: [],
      });

    await renderPublicRoute(
      await ParkDetailPage({
        params: Promise.resolve({ slug: "pallas" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.queryByRole("img", { name: "Pallas-Yllästunturi" })).not.toBeInTheDocument();
  });

  it("renders a simple fallback when the park detail page cannot load the park", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await renderPublicRoute(
      await ParkDetailPage({
        params: Promise.resolve({ slug: "missing-park" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByText("park.detailTitle")).toBeInTheDocument();
  });

  it("falls back to an authenticated park fetch when a removed park is hidden from the public API", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(Object.assign(new Error("hidden"), { status: 404 }));
    vi.mocked(apiAuthFetch).mockResolvedValueOnce({
      ...publicPark,
      boundaryGeoJson: null,
    });
    vi.mocked(apiFetch).mockResolvedValueOnce({
      visitedSummary: {
        visited: false,
        visitCount: 0,
        lastVisitedOn: null,
      },
      visits: [],
    });

    await renderPublicRoute(
      await ParkDetailPage({
        params: Promise.resolve({ slug: "pallas" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(apiAuthFetch).toHaveBeenCalledWith("/api/parks/pallas?includeBoundary=true", {
      cache: "no-store",
    });
    expect(screen.getByRole("heading", { name: "Pallas-Yllästunturi" })).toBeInTheDocument();
  });

  it("renders the public visits page with selected year and month filters", async () => {
    vi.mocked(apiPublicFetch).mockResolvedValueOnce({ visits: [visitWithPark] });

    await renderPublicRoute(
      await PublicVisitsPage({
        searchParams: Promise.resolve({ year: "2024", month: "6" }),
      }),
    );

    expect(screen.getByTestId("public-visits-timeline")).toHaveTextContent(
      "visits:1|year:2024|month:6|error:none",
    );
  });

  it("builds translated metadata for the public visits page", async () => {
    await expect(generatePublicVisitsMetadata()).resolves.toEqual({
      title: "visits.title",
    });
  });

  it("builds park detail metadata from the fetched park name and falls back to the slug", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ name: "Pallas-Yllästunturi" })
      .mockRejectedValueOnce(new Error("missing"));

    await expect(
      generateParkDetailMetadata({ params: Promise.resolve({ slug: "pallas-yllastunturi" }) }),
    ).resolves.toEqual({
      title: "Pallas-Yllästunturi",
    });

    await expect(
      generateParkDetailMetadata({ params: Promise.resolve({ slug: "repovesi-kansallispuisto" }) }),
    ).resolves.toEqual({
      title: "repovesi kansallispuisto",
    });
  });

  it("renders the control panel overview page", async () => {
    await renderControlPanelRoute(await ControlPanelPage());

    expect(
      screen.getByRole("heading", { name: "controlPanel.dashboard.title" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "controlPanel.title" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "controlPanel.dashboard.title" })).toHaveAttribute(
      "href",
      "/control-panel",
    );
    expect(screen.getByRole("link", { name: "controlPanel.parks.title" })).toHaveAttribute(
      "href",
      "/control-panel/parks",
    );
    expect(screen.getByRole("link", { name: "controlPanel.visits.title" })).toHaveAttribute(
      "href",
      "/control-panel/visits",
    );
    expect(screen.getByText("controlPanel.dashboard.description")).toBeInTheDocument();
  });

  it("builds metadata for the control panel dashboard", async () => {
    await expect(generateControlPanelMetadata()).resolves.toEqual({
      title: "controlPanel.title",
    });
  });

  it("renders the parks list page", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      visibleParks: [adminVisibilityPark],
      removedParks: [],
    });

    await renderControlPanelRoute(await ParksPage());

    expect(apiFetch).toHaveBeenNthCalledWith(1, "/api/admin/parks/visibility", {
      cache: "force-cache",
      next: {
        tags: ["admin-park-visibility"],
      },
    });
    expect(screen.getByRole("navigation", { name: "controlPanel.title" })).toBeInTheDocument();
    expect(screen.getByTestId("park-management")).toHaveTextContent("parks:1|removed:0");
  });

  it("builds metadata for the parks list page", async () => {
    await expect(generateParksMetadata()).resolves.toEqual({
      title: "controlPanel.parks.title",
    });
  });

  it("renders the park edit page with navigation helpers", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(publicPark);

    await renderControlPanelRoute(
      await EditParkPage({
        params: Promise.resolve({ slug: "pallas" }),
        searchParams: Promise.resolve({ updated: "1" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "controlPanel.parks.edit.title" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "controlPanel.parks.edit.backToList" }),
    ).toHaveAttribute("href", "/control-panel/parks");
    expect(
      screen.getByRole("link", { name: "controlPanel.parks.edit.viewParkPage" }),
    ).toHaveAttribute("href", "/park/pallas");
    expect(screen.getByText("controlPanel.parks.edit.updatedNotice")).toBeInTheDocument();
    expect(screen.getByTestId("park-form")).toHaveTextContent(
      "slug:pallas|name:Pallas-Yllästunturi",
    );
  });

  it("builds metadata for the park edit page", async () => {
    await expect(generateEditParkMetadata()).resolves.toEqual({
      title: "controlPanel.parks.edit.title",
    });
  });

  it("renders the visits list page", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ visits: [visitWithPark] });

    await renderControlPanelRoute(await VisitsPage());

    expect(screen.getByRole("heading", { name: "controlPanel.visits.title" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "controlPanel.title" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "controlPanel.visits.addVisit" })).toHaveAttribute(
      "href",
      "/control-panel/visits/new",
    );
    expect(screen.getByTestId("visit-list")).toHaveTextContent("visits:1");
  });

  it("builds metadata for the visits list page", async () => {
    await expect(generateVisitsMetadata()).resolves.toEqual({
      title: "controlPanel.visits.title",
    });
  });

  it("renders the new visit page with the selected park preset", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks: [publicPark] });

    await renderControlPanelRoute(
      await NewVisitPage({
        searchParams: Promise.resolve({ park: "pallas" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "controlPanel.visits.newVisit.title" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("visit-form")).toHaveTextContent("parks:1|edit:new|default:pallas");
  });

  it("builds metadata for the new visit page", async () => {
    await expect(generateNewVisitMetadata()).resolves.toEqual({
      title: "controlPanel.visits.newVisit.title",
    });
  });

  it("renders the edit visit page with the created notice and edit helpers", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ parks: [publicPark] })
      .mockResolvedValueOnce(visitWithPark);

    await renderControlPanelRoute(
      await EditVisitPage({
        params: Promise.resolve({ id: "10" }),
        searchParams: Promise.resolve({ created: "1" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "controlPanel.visits.editVisit.title" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "controlPanel.visits.editVisit.viewParkPage" }),
    ).toHaveAttribute("href", "/park/pallas");
    expect(screen.getByText("controlPanel.visits.editVisit.createdNotice")).toBeInTheDocument();
    expect(screen.getByTestId("visit-form")).toHaveTextContent("parks:1|edit:10|default:none");
    expect(screen.getByTestId("visit-image-section")).toHaveTextContent("visit:10|images:1");
  });

  it("builds metadata for the edit visit page", async () => {
    await expect(generateEditVisitMetadata()).resolves.toEqual({
      title: "controlPanel.visits.editVisit.title",
    });
  });

  it("calls notFound when the edit visit page cannot find the requested visit", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ parks: [publicPark] })
      .mockResolvedValueOnce(null);

    await expect(
      EditVisitPage({
        params: Promise.resolve({ id: "999" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("renders the login page with an access error", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({ error: "access_denied" }),
      }),
    );

    expect(screen.getByRole("heading", { name: "auth.login" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("auth.accessDenied");
    expect(screen.getByRole("link", { name: "auth.loginToControlPanel" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
  });

  it("renders the not found page with a link back home", async () => {
    render(await NotFoundPage());

    expect(screen.getByRole("heading", { name: "errors.notFound.title" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "errors.notFound.goHome" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders the offline page", async () => {
    render(await OfflinePage());

    expect(screen.getByRole("heading", { name: "errors.offline.title" })).toBeInTheDocument();
    expect(screen.getByText("errors.offline.description")).toBeInTheDocument();
  });
});
