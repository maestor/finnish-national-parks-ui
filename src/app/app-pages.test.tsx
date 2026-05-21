import { apiFetch } from "@/lib/api";
import type { Park, PersonalPark } from "@/lib/parks";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserLayout from "./(user)/layout";
import HomePage, { generateMetadata as generateHomeMetadata } from "./(user)/page";
import ParkDetailPage, {
  generateMetadata as generateParkDetailMetadata,
} from "./(user)/park/[slug]/page";
import ControlPanelLayout from "./control-panel/layout";
import ControlPanelPage, {
  generateMetadata as generateControlPanelMetadata,
} from "./control-panel/page";
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
  apiFetch: vi.fn(),
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
    isAuthenticated,
  }: {
    parks: Park[];
    error?: string | null;
    isAuthenticated?: boolean;
  }) => (
    <div data-testid="park-explorer">
      parks:{parks.length}|auth:{String(isAuthenticated)}|error:{error ?? "none"}
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

vi.mock("@/components/dashboard/stats-cards", () => ({
  StatsCards: ({
    totalVisits,
    uniqueParks,
    parksWithNotes,
    mostVisitedPark,
  }: {
    totalVisits: number;
    uniqueParks: number;
    parksWithNotes: number;
    mostVisitedPark: { name: string; visitCount: number } | null;
  }) => (
    <div data-testid="stats-cards">
      total:{totalVisits}|unique:{uniqueParks}|notes:{parksWithNotes}|most:
      {mostVisitedPark ? `${mostVisitedPark.name}:${mostVisitedPark.visitCount}` : "none"}
    </div>
  ),
}));

vi.mock("@/components/dashboard/progress-section", () => ({
  ProgressSection: ({
    items,
  }: {
    items: { typeName: string; visited: number; total: number }[];
  }) => <div data-testid="progress-section">items:{items.length}</div>,
}));

vi.mock("@/components/dashboard/recent-visits", () => ({
  RecentVisits: ({
    visits,
  }: {
    visits: { id: number; parkName: string; parkSlug: string; visitedOn: string }[];
  }) => <div data-testid="recent-visits">visits:{visits.length}</div>,
}));

vi.mock("@/components/visits/visit-list", () => ({
  VisitList: ({ parks }: { parks: PersonalPark[] }) => (
    <div data-testid="visit-list">parks:{parks.length}</div>
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

const publicPark = {
  slug: "pallas",
  name: "Pallas-Yllästunturi",
  areaKm2: 14,
  locationLabel: "Lappi",
  luontoonUrl: "https://example.com/pallas",
  establishmentYear: 1938,
  boundingBox: { minLat: 67, minLon: 23, maxLat: 68, maxLon: 25 },
  markerPoint: { lat: 67.5, lon: 24 },
  type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
} as Park;

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
};

const personalPark = {
  ...publicPark,
  visitedSummary: { visited: true, visitCount: 1 },
  visits: [personalVisit],
} as PersonalPark;

const renderPublicRoute = async (page: React.ReactNode) => {
  render(UserLayout({ children: page }));
};

const renderControlPanelRoute = async (page: React.ReactNode) => {
  render(await ControlPanelLayout({ children: page }));
};

describe("App pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  it("renders the home page with authenticated parks", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks: [personalPark] });

    await renderPublicRoute(await HomePage());

    expect(screen.getByTestId("park-explorer")).toHaveTextContent("parks:1|auth:true|error:none");
  });

  it("falls back to public parks on the home page when personal data fails", async () => {
    vi.mocked(apiFetch)
      .mockRejectedValueOnce(new Error("unauthorized"))
      .mockResolvedValueOnce({ parks: [publicPark] });

    await renderPublicRoute(await HomePage());

    expect(screen.getByTestId("park-explorer")).toHaveTextContent("parks:1|auth:false|error:none");
  });

  it("shows the fallback error message when both home page park requests fail", async () => {
    vi.mocked(apiFetch)
      .mockRejectedValueOnce(new Error("unauthorized"))
      .mockRejectedValueOnce(new Error("backend offline"));

    await renderPublicRoute(await HomePage());

    expect(screen.getByTestId("park-explorer")).toHaveTextContent(
      "parks:0|auth:false|error:backend offline",
    );
  });

  it("builds translated metadata for the home page", async () => {
    await expect(generateHomeMetadata()).resolves.toEqual({
      title: "home.title",
    });
  });

  it("renders the park detail page with main content and visit history", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        ...publicPark,
        boundaryGeoJson: { type: "FeatureCollection", features: [] },
      })
      .mockResolvedValueOnce(personalPark);

    await renderPublicRoute(await ParkDetailPage({ params: Promise.resolve({ slug: "pallas" }) }));

    expect(screen.getByRole("heading", { name: "Pallas-Yllästunturi" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "park.addVisit" })).toHaveAttribute(
      "href",
      "/control-panel/visits/new?park=pallas",
    );
    expect(screen.getByTestId("park-boundary-map")).toHaveTextContent("Pallas-Yllästunturi");
    expect(screen.getByTestId("visit-accordion")).toHaveTextContent("visits:1|editable:true");
  });

  it("renders a simple fallback when the park detail page cannot load the park", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await renderPublicRoute(
      await ParkDetailPage({ params: Promise.resolve({ slug: "missing-park" }) }),
    );

    expect(screen.getByText("park.detailTitle")).toBeInTheDocument();
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
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks: [personalPark] });

    await renderControlPanelRoute(await ControlPanelPage());

    expect(
      screen.getByRole("heading", { name: "controlPanel.dashboard.title" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "controlPanel.title" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "controlPanel.dashboard.title" })).toHaveAttribute(
      "href",
      "/control-panel",
    );
    expect(screen.getByRole("link", { name: "controlPanel.visits.title" })).toHaveAttribute(
      "href",
      "/control-panel/visits",
    );
    expect(screen.getByTestId("stats-cards")).toHaveTextContent(
      "total:1|unique:1|notes:1|most:Pallas-Yllästunturi:1",
    );
    expect(screen.getByTestId("progress-section")).toHaveTextContent("items:1");
    expect(screen.getByTestId("recent-visits")).toHaveTextContent("visits:1");
  });

  it("builds metadata for the control panel dashboard", async () => {
    await expect(generateControlPanelMetadata()).resolves.toEqual({
      title: "controlPanel.title",
    });
  });

  it("renders the visits list page", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ parks: [personalPark] });

    await renderControlPanelRoute(await VisitsPage());

    expect(screen.getByRole("heading", { name: "controlPanel.visits.title" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "controlPanel.title" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "controlPanel.visits.addVisit" })).toHaveAttribute(
      "href",
      "/control-panel/visits/new",
    );
    expect(screen.getByTestId("visit-list")).toHaveTextContent("parks:1");
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
      .mockResolvedValueOnce({ parks: [personalPark] });

    await renderControlPanelRoute(
      await EditVisitPage({
        params: Promise.resolve({ id: "10" }),
        searchParams: Promise.resolve({ created: "1" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "controlPanel.visits.editVisit.title" }),
    ).toBeInTheDocument();
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
      .mockResolvedValueOnce({ parks: [personalPark] });

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
      "http://localhost:3004/auth/google",
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
