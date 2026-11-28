import { fireEvent, render as renderTestingLibrary, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SnackbarProvider } from "@/components/providers/snackbar-provider";
import { apiFetch } from "@/lib/api";
import type { AdminLinkedTrail, AdminVisibilityPark } from "@/lib/parks";
import { ParkList } from "./park-list";

const { mockRevalidatePublicCache } = vi.hoisted(() => ({
  mockRevalidatePublicCache: vi.fn(async () => true),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/public-cache", () => ({
  revalidatePublicCache: mockRevalidatePublicCache,
}));

const parks: AdminVisibilityPark[] = [
  {
    slug: "teijo",
    name: "Teijon kansallispuisto",
    address: "Matildanjärventie 84, 25570 Salo",
    locationLabel: "Matildanjärventie 84",
    boundingBox: { minLat: 60, minLon: 22, maxLat: 61, maxLon: 23 },
    markerPoint: { lat: 60.2, lon: 22.9 },
    postalCode: "25570",
    postalOffice: "Salo",
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
  },
  {
    slug: "aulanko",
    name: "Aulangon luonnonsuojelualue",
    displayTypeName: "Maailmanperintökohde",
    address: "Aulangontie 93, 13220 Hämeenlinna",
    locationLabel: "Aulangontie 93",
    boundingBox: { minLat: 61, minLon: 24, maxLat: 62, maxLon: 25 },
    markerPoint: { lat: 61.1, lon: 24.5 },
    postalCode: "13220",
    postalOffice: "Hämeenlinna",
    type: { code: 4, id: 4, name: "Muu luonnonsuojelualue", slug: "nature-reserve-area" },
  },
];

const removedParks: AdminVisibilityPark[] = [
  {
    slug: "repovesi",
    name: "Repoveden kansallispuisto",
    address: "Lapinsalmentie 170, 47910 Kouvola",
    locationLabel: "Lapinsalmentie 170",
    boundingBox: { minLat: 61, minLon: 26, maxLat: 62, maxLon: 27 },
    markerPoint: { lat: 61.3, lon: 26.5 },
    postalCode: "47910",
    postalOffice: "Kouvola",
    type: { code: 1, id: 1, name: "Kansallispuisto", slug: "national-park" },
  },
];

const trail: AdminVisibilityPark = {
  ...removedParks[0],
  name: "Klassarinkierros",
  slug: "klassarinkierros",
  type: { code: 4404, id: 4404, name: "Luontopolku", slug: "nature-trail" },
};

const linkedTrail: AdminLinkedTrail = {
  ...trail,
  linkedAreas: [
    { name: "Nuuksion kansallispuisto", slug: "nuuksio" },
    { name: "Haukkalammen ulkoilualue", slug: "haukkalampi" },
  ],
};

const render = (ui: Parameters<typeof renderTestingLibrary>[0]) =>
  renderTestingLibrary(<SnackbarProvider>{ui}</SnackbarProvider>);

describe("ParkList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });

  it("renders parks sorted by name with edit links in the name column", () => {
    render(<ParkList parks={parks} removedParks={removedParks} linkedTrails={[]} />);

    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Aulangon luonnonsuojelualue" })).toHaveAttribute(
      "href",
      "/hallinta/paikat/aulanko/muokkaa",
    );
    expect(screen.getByRole("link", { name: "Teijon kansallispuisto" })).toHaveAttribute(
      "href",
      "/hallinta/paikat/teijo/muokkaa",
    );
    expect(screen.getByText("Maailmanperintökohde")).toBeInTheDocument();
    expect(screen.getByText("Aulangontie 93, 13220 Hämeenlinna")).toBeInTheDocument();
  });

  it("uses the park page link for removed parks on the hidden tab", () => {
    render(<ParkList parks={parks} removedParks={removedParks} linkedTrails={[]} />);

    fireEvent.click(screen.getByRole("tab", { name: "controlPanel.parks.tabs.hidden" }));

    expect(screen.getByRole("link", { name: "Repoveden kansallispuisto" })).toHaveAttribute(
      "href",
      "/paikka/repovesi",
    );
  });

  it("moves linked trails out of the hidden list and shows all linked areas without restore", async () => {
    const user = userEvent.setup();
    render(
      <ParkList
        parks={parks}
        removedParks={[...removedParks, trail]}
        linkedTrails={[linkedTrail]}
      />,
    );

    const hiddenTab = screen.getByRole("tab", { name: "controlPanel.parks.tabs.hidden" });
    await user.click(hiddenTab);
    expect(screen.getByRole("link", { name: "Repoveden kansallispuisto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "controlPanel.parks.restoreAction" })).toBeEnabled();
    expect(screen.queryByRole("link", { name: "Klassarinkierros" })).not.toBeInTheDocument();

    await user.keyboard("{ArrowRight}");

    const linkedTab = screen.getByRole("tab", { name: "controlPanel.parks.tabs.linked" });
    expect(linkedTab).toHaveFocus();
    expect(linkedTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "controlPanel.parks.tabs.linked" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Klassarinkierros" })).toHaveAttribute(
      "href",
      "/paikka/klassarinkierros",
    );
    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toHaveAttribute(
      "href",
      "/hallinta/paikat/nuuksio/muokkaa",
    );
    expect(screen.getByRole("link", { name: "Haukkalammen ulkoilualue" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "controlPanel.parks.restoreAction" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Repoveden kansallispuisto" })).toBeNull();

    const search = screen.getByLabelText("controlPanel.parks.filters.searchLabel");
    await user.tab();
    expect(search).toHaveFocus();
    await user.type(search, "Nuuksio");
    expect(screen.getByRole("link", { name: "Klassarinkierros" })).toBeInTheDocument();
    await user.type(search, "xx");
    expect(screen.getByText("controlPanel.parks.emptyFiltered")).toBeInTheDocument();
  });

  it("lists visible and hidden linked areas with their main park and retains standalone tabs", async () => {
    const user = userEvent.setup();
    const main = { id: 14, name: "Hämeenlinnan kansallinen kaupunkipuisto", slug: "hameenlinna" };
    const linkedAreas = [
      { ...parks[1], mainPark: main },
      { ...removedParks[0], mainPark: main },
    ];
    const view = render(
      <ParkList
        parks={parks}
        removedParks={removedParks}
        linkedTrails={[linkedTrail]}
        linkedAreas={linkedAreas}
      />,
    );
    await user.click(screen.getByRole("tab", { name: "controlPanel.parks.tabs.linked" }));
    expect(
      screen.getByRole("heading", { name: "controlPanel.parks.linkedTrailsSection" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "controlPanel.parks.linkedAreasSection" }),
    ).toBeVisible();
    expect(screen.getAllByRole("link", { name: main.name })).toHaveLength(2);
    expect(screen.getByRole("link", { name: removedParks[0].name })).toHaveAttribute(
      "href",
      "/hallinta/paikat/repovesi/muokkaa",
    );
    view.rerender(
      <SnackbarProvider>
        <ParkList
          parks={parks}
          removedParks={removedParks}
          linkedTrails={[linkedTrail]}
          linkedAreas={linkedAreas.slice(0, 1)}
        />
      </SnackbarProvider>,
    );
    expect(screen.queryByRole("link", { name: removedParks[0].name })).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "controlPanel.parks.tabs.hidden" }));
    expect(screen.getByRole("link", { name: removedParks[0].name })).toHaveAttribute(
      "href",
      "/paikka/repovesi",
    );
    await user.click(screen.getByRole("tab", { name: "controlPanel.parks.tabs.visible" }));
    expect(screen.getByRole("link", { name: parks[1].name })).toHaveAttribute(
      "href",
      "/hallinta/paikat/aulanko/muokkaa",
    );
  });

  it("shows an empty linked-trails tab when no hidden trails are linked", async () => {
    const user = userEvent.setup();
    render(<ParkList parks={[...parks, trail]} removedParks={[]} linkedTrails={[linkedTrail]} />);

    const visibleTab = screen.getByRole("tab", { name: "controlPanel.parks.tabs.visible" });
    await user.click(visibleTab);
    expect(screen.getByRole("link", { name: "Klassarinkierros" })).toBeInTheDocument();

    await user.keyboard("{End}");
    expect(screen.getByText("controlPanel.parks.emptyLinked")).toBeVisible();
    await user.keyboard("{ArrowRight}");
    expect(visibleTab).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "controlPanel.parks.tabs.linked" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(visibleTab).toHaveFocus();
  });

  it("removes a park after confirmation without waiting for a route refresh", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<ParkList parks={parks} removedParks={removedParks} linkedTrails={[]} />);

    fireEvent.click(screen.getAllByRole("button", { name: "controlPanel.parks.removeAction" })[0]);

    expect(window.confirm).toHaveBeenCalledWith("controlPanel.parks.confirmRemove");

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/parks/aulanko/removed", {
        method: "PATCH",
        body: JSON.stringify({ removed: true }),
      });
    });

    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "aulanko" });
    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: "Aulangon luonnonsuojelualue" }),
      ).not.toBeInTheDocument();
    });
  });

  it("does not call the API when park removal is cancelled", () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );

    render(<ParkList parks={parks} removedParks={removedParks} linkedTrails={[]} />);

    fireEvent.click(screen.getAllByRole("button", { name: "controlPanel.parks.removeAction" })[0]);

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("shows an error when park removal fails", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("remove failed"));

    render(<ParkList parks={parks} removedParks={removedParks} linkedTrails={[]} />);

    fireEvent.click(screen.getAllByRole("button", { name: "controlPanel.parks.removeAction" })[0]);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("remove failed");
    });

    expect(screen.getByRole("link", { name: "Aulangon luonnonsuojelualue" })).toBeInTheDocument();
  });

  it("shows removed parks on the hidden tab and restores them", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<ParkList parks={parks} removedParks={removedParks} linkedTrails={[]} />);

    fireEvent.click(screen.getByRole("tab", { name: "controlPanel.parks.tabs.hidden" }));
    fireEvent.click(screen.getByRole("button", { name: "controlPanel.parks.restoreAction" }));

    expect(window.confirm).toHaveBeenCalledWith("controlPanel.parks.confirmRestore");

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/parks/repovesi/removed", {
        method: "PATCH",
        body: JSON.stringify({ removed: false }),
      });
    });

    expect(mockRevalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "repovesi" });
    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: "Repoveden kansallispuisto" }),
      ).not.toBeInTheDocument();
    });
  });

  it("filters parks by search query and type", async () => {
    const user = userEvent.setup();

    render(<ParkList parks={parks} removedParks={removedParks} linkedTrails={[]} />);

    await user.type(screen.getByLabelText("controlPanel.parks.filters.searchLabel"), "Teijo");

    expect(screen.getByRole("link", { name: "Teijon kansallispuisto" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Aulangon luonnonsuojelualue" }),
    ).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("controlPanel.parks.filters.searchLabel"));
    await user.selectOptions(
      screen.getByLabelText("controlPanel.parks.filters.typeLabel"),
      "nature-reserve-area",
    );

    expect(screen.getByRole("link", { name: "Aulangon luonnonsuojelualue" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Teijon kansallispuisto" })).not.toBeInTheDocument();
  });

  it("matches a park by its custom display type name in the search filter", async () => {
    const user = userEvent.setup();

    render(<ParkList parks={parks} removedParks={removedParks} linkedTrails={[]} />);

    await user.type(
      screen.getByLabelText("controlPanel.parks.filters.searchLabel"),
      "maailmanperintö",
    );

    expect(screen.getByRole("link", { name: "Aulangon luonnonsuojelualue" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Teijon kansallispuisto" })).not.toBeInTheDocument();
  });

  it("matches a park by its address in the search filter", async () => {
    const user = userEvent.setup();

    render(<ParkList parks={parks} removedParks={removedParks} linkedTrails={[]} />);

    await user.type(screen.getByLabelText("controlPanel.parks.filters.searchLabel"), "13220");

    expect(screen.getByRole("link", { name: "Aulangon luonnonsuojelualue" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Teijon kansallispuisto" })).not.toBeInTheDocument();
  });

  it("shows filtered empty state and resets the filters", async () => {
    const user = userEvent.setup();

    render(<ParkList parks={parks} removedParks={removedParks} linkedTrails={[]} />);

    await user.type(screen.getByLabelText("controlPanel.parks.filters.searchLabel"), "Lemmenjoki");

    expect(screen.getByText("controlPanel.parks.emptyFiltered")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "controlPanel.parks.filters.reset" }));

    expect(screen.queryByText("controlPanel.parks.emptyFiltered")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Teijon kansallispuisto" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aulangon luonnonsuojelualue" })).toBeInTheDocument();
  });

  it("shows an empty state when there are no parks in the active tab", () => {
    render(<ParkList parks={[]} removedParks={removedParks} linkedTrails={[]} />);

    expect(screen.getByText("controlPanel.parks.emptyVisible")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "controlPanel.parks.tabs.hidden" }));

    expect(screen.getByRole("link", { name: "Repoveden kansallispuisto" })).toBeInTheDocument();
  });

  it("shows an empty state when there are no parks to manage at all", () => {
    render(<ParkList parks={[]} removedParks={[]} linkedTrails={[]} />);

    expect(screen.getByText("controlPanel.parks.emptyAll")).toBeInTheDocument();
  });
});
