import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/test/i18n";
import { ParkLocation } from "./park-location";
import { ParkTrailNavigationProvider } from "./park-trail-navigation";
import { VisitAccordion } from "./visit-accordion";

vi.unmock("next-intl");
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
});
vi.mock("@/components/map/lazy-park-boundary-map", () => ({
  LazyParkBoundaryMap: ({
    onPick,
    onReset,
    cameraRequest,
  }: {
    cameraRequest: { slug: string | null; sequence: number } | null;
    onPick: (slug: string) => void;
    onReset: () => void;
  }) => (
    <div>
      <span data-testid="map-request">
        {cameraRequest ? `${cameraRequest.slug ?? "area"}:${cameraRequest.sequence}` : "none"}
      </span>
      <button type="button" onClick={() => onPick("known")}>
        Map single
      </button>
      <button type="button" onClick={onReset}>
        Map reset
      </button>
    </div>
  ),
}));

const geometry = { type: "FeatureCollection" as const, features: [] };
const trails = [
  {
    slug: "known",
    name: "Tunnettu reitti",
    lengthKm: 2.5,
    address: "Reitin osoite",
    boundaryGeoJson: geometry,
  },
  {
    slug: "unknown",
    name: "Tuntematon reitti",
    lengthKm: null,
    address: null,
    boundaryGeoJson: geometry,
  },
  { slug: "zero", name: "Nollareitti", lengthKm: 0, address: null, boundaryGeoJson: geometry },
];

const props = {
  boundaryGeoJson: geometry,
  boundingBox: { minLat: 60, maxLat: 61, minLon: 24, maxLon: 25 },
  markerPoint: { lat: 60, lon: 24 },
  parkName: "Puisto",
  linkedTrails: trails,
  areaContent: <span>Puiston osoite</span>,
};

describe("ParkLocation", () => {
  it("orders the whole area, subareas and trails and fits repeat selections", async () => {
    const user = userEvent.setup();
    render(
      <ParkLocation
        {...props}
        linkedAreas={[
          { id: 1, name: "Langinkoski", slug: "langinkoski", boundaryGeoJson: geometry },
        ]}
      />,
      { wrapper: I18nProvider },
    );
    const group = screen.getByRole("group", { name: "Karttavalinta" });
    expect(within(group).getAllByRole("button").slice(0, 3)).toEqual([
      within(group).getByRole("button", { name: "Koko kohde" }),
      within(group).getByRole("button", { name: "Langinkoski" }),
      within(group).getByRole("button", { name: "Tunnettu reitti" }),
    ]);
    expect(within(group).getByText("Alueet (1)")).toBeVisible();
    expect(within(group).getByText("Reitit (3)")).toBeVisible();
    const choice = within(group).getByRole("button", { name: "Langinkoski" });
    choice.focus();
    await user.keyboard("{Enter}");
    expect(choice).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByTestId("map-request")).toHaveTextContent("langinkoski:1");
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("map-request")).toHaveTextContent("langinkoski:2");
    await user.click(within(group).getByRole("button", { name: "Koko kohde" }));
    expect(screen.getByTestId("map-request")).toHaveTextContent("area:3");
  });
  it("marks linked areas as visited and links their visits even when they have free text", async () => {
    const user = userEvent.setup();
    const area = { id: 1, name: "Langinkoski", slug: "langinkoski" };
    const address = "Keisarinmajantie 118, 48230 Kotka";
    const parkUrl = "https://www.luontoon.fi/langinkoski";
    const unvisited = { id: 2, name: "Aulanko", slug: "aulanko" };
    const visits = [
      { id: 2, visitedOn: "2025-05-03", areas: [area], route: "Oma kierros" },
      { id: 1, visitedOn: "2020-09-13", route: "Aulanko" },
    ] as import("@/lib/parks").Visit[];
    render(
      <ParkLocation
        {...props}
        parkSlug="puisto"
        linkedAreas={[
          { ...area, address, parkUrl, boundaryGeoJson: geometry },
          { ...unvisited, boundaryGeoJson: geometry },
        ]}
        visits={visits}
      />,
      { wrapper: I18nProvider },
    );
    const choices = within(screen.getByRole("group", { name: "Karttavalinta" }));
    await user.click(choices.getByRole("button", { name: "Langinkoski Käyty" }));
    const panel = within(screen.getByTestId("selection-details"));
    expect(panel.getByText("Käyty")).toBeInTheDocument();
    expect(panel.getByText(address)).toBeVisible();
    const officialLink = panel.getByRole("link", {
      name: "Lisätietoja (avautuu uuteen välilehteen)",
    });
    expect(officialLink).toHaveAttribute("href", parkUrl);
    expect(officialLink).toHaveAttribute("target", "_blank");
    expect(panel.getByRole("link", { name: "3.5.2025" })).toHaveAttribute(
      "href",
      "/paikka/puisto?visit=2#visit-history",
    );

    await user.click(choices.getByRole("button", { name: "Aulanko" }));
    expect(panel.queryByText("Käyty")).not.toBeInTheDocument();
    expect(panel.queryByRole("link")).not.toBeInTheDocument();
  });
  it("shows a new-tab details badge for the selected trail with a URL", async () => {
    const user = userEvent.setup();
    const parkUrl = "https://www.luontoon.fi/testi-luontopolku";
    render(
      <ParkLocation
        {...props}
        linkedTrails={[{ ...trails[0], parkUrl }, { ...trails[1], parkUrl: null }, trails[2]]}
      />,
      { wrapper: I18nProvider },
    );
    const panel = within(screen.getByTestId("selection-details"));
    await user.click(screen.getByRole("button", { name: "Tunnettu reitti" }));
    const link = panel.getByRole("link", { name: "Lisätietoja (avautuu uuteen välilehteen)" });
    expect(link).toHaveAttribute("href", parkUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");

    for (const name of ["Tuntematon reitti", "Nollareitti"]) {
      await user.click(screen.getByRole("button", { name }));
      expect(panel.queryByRole("link", { name: /Lisätietoja/ })).not.toBeInTheDocument();
    }
  });
  it.each([
    {
      type: "openstreetmap" as const,
      relationId: 123,
      sourceUrl: "https://www.openstreetmap.org/relation/123",
      attribution: "© OpenStreetMap contributors",
      licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    },
    {
      type: "openstreetmap-curated" as const,
      sourceUrls: ["https://www.openstreetmap.org/way/123"],
      attribution: "© OpenStreetMap contributors",
      licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    },
  ])("shows trail details without a separate source panel for $type", async (source) => {
    const user = userEvent.setup();
    render(<ParkLocation {...props} linkedTrails={[{ ...trails[0], source }]} />, {
      wrapper: I18nProvider,
    });
    await user.click(screen.getByRole("button", { name: "Tunnettu reitti" }));
    const panel = screen.getByTestId("selection-details");
    expect(within(panel).getByText("Tunnettu reitti")).toBeInTheDocument();
    expect(within(panel).getByText("2,5 km")).toBeInTheDocument();
    expect(within(panel).queryByText("© OpenStreetMap contributors")).not.toBeInTheDocument();
    expect(within(panel).queryByText("Reitin lähdetiedot")).not.toBeInTheDocument();
    expect(within(panel).queryByRole("link", { name: /OSM-kohde|ODbL/ })).not.toBeInTheDocument();
  });
  it("shows only explicitly linked visit dates for current trails", async () => {
    const user = userEvent.setup();
    const visits = [
      {
        id: 2,
        visitedOn: "2025-05-03",
        trails: [{ id: 1, slug: "known", name: "Tunnettu reitti" }],
      },
      {
        id: 1,
        visitedOn: "2020-09-13",
        trails: [{ id: 2, slug: "other", name: "Tunnettu reitti" }],
        route: "Tunnettu reitti",
      },
    ] as import("@/lib/parks").Visit[];
    render(<ParkLocation {...props} parkSlug="puisto" visits={visits} />, {
      wrapper: I18nProvider,
    });
    await user.click(screen.getByRole("button", { name: /Tunnettu reitti/ }));
    const panel = screen.getByTestId("selection-details");
    expect(within(panel).getByRole("link", { name: /3.5.2025/ })).toHaveAttribute(
      "href",
      "/paikka/puisto?visit=2#visit-history",
    );
    expect(within(panel).queryByText("13.9.2020")).not.toBeInTheDocument();
    const link = within(panel).getByRole("link", { name: /3.5.2025/ });
    link.addEventListener("click", (event) => event.preventDefault());
    const dispatch = vi.spyOn(window, "dispatchEvent");
    for (const options of [
      { metaKey: true },
      { ctrlKey: true },
      { shiftKey: true },
      { altKey: true },
      { button: 1 },
    ]) {
      fireEvent.click(link, options);
      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: "park-visit-navigation" }),
      );
    }
    fireEvent.click(link);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "park-visit-navigation", detail: 2 }),
    );
    dispatch.mockRestore();
  });
  it("distinguishes same-day visits and clears visited state when membership disappears", async () => {
    const user = userEvent.setup();
    const link = { id: 1, slug: "known", name: "Tunnettu reitti" };
    const visits = [
      { id: 1, visitedOn: "2025-05-03", trails: [link] },
      { id: 2, visitedOn: "2025-05-03", trails: [link] },
      { id: 3, visitedOn: "2026-01-01" },
    ] as import("@/lib/parks").Visit[];
    const { rerender } = render(<ParkLocation {...props} parkSlug="puisto" visits={visits} />, {
      wrapper: I18nProvider,
    });
    expect(
      screen
        .getByRole("button", { name: "Tunnettu reitti Käyty" })
        .querySelectorAll(".lucide-check"),
    ).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Tunnettu reitti Käyty" }));
    const panel = screen.getByTestId("selection-details");
    expect(within(panel).getByText(/2 käyntiä/)).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "3.5.2025, 1. käynti" })).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "3.5.2025, 2. käynti" })).toBeInTheDocument();
    rerender(<ParkLocation {...props} parkSlug="puisto" visits={[visits[2]]} />);
    expect(within(panel).queryByText("Ei linkitettyjä käyntejä")).not.toBeInTheDocument();
    expect(within(panel).queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tunnettu reitti" }).querySelector(".lucide-check"),
    ).toBeNull();
  });
  it.each([false, true])(
    "selects a visit trail repeatedly and moves focus to the map, reduced motion: %s",
    async (reducedMotion) => {
      const user = userEvent.setup();
      const scroll = vi.fn();
      vi.spyOn(window, "matchMedia").mockImplementation(
        () =>
          ({
            matches: reducedMotion,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          }) as unknown as MediaQueryList,
      );
      const visit = {
        id: 42,
        visitedOn: "2026-11-12",
        createdAt: "2026-11-12",
        updatedAt: "2026-11-12",
        route: "Original route",
        note: "Visit note",
        author: null,
        location: null,
        excludeFromRoute: false,
        trip: null,
        tripStopOrder: null,
        images: [],
        trails: [
          { id: 10, slug: "known", name: "Tunnettu reitti" },
          { id: 20, slug: "no-geometry", name: "Ei geometriaa" },
        ],
      };
      render(
        <ParkTrailNavigationProvider trailSlugs={["known"]}>
          <section
            id="park-location"
            tabIndex={-1}
            ref={(element) => {
              if (element) element.scrollIntoView = scroll;
            }}
          >
            <ParkLocation {...props} />
          </section>
          <VisitAccordion parkSlug="puisto" visits={[visit]} />
        </ParkTrailNavigationProvider>,
        { wrapper: I18nProvider },
      );
      const headings = screen.getAllByRole("heading", { level: 3 });
      expect(headings[0]).toHaveTextContent("Reitit");
      expect(screen.getByText("Original route")).toBeInTheDocument();
      expect(screen.getByText("Ei geometriaa")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Ei geometriaa/ })).not.toBeInTheDocument();
      const link = screen.getByRole("button", { name: "Näytä Tunnettu reitti kartalla" });
      await user.click(link);
      expect(await screen.findByTestId("map-request")).toHaveTextContent("known:1");
      expect(document.getElementById("park-location")).toHaveFocus();
      expect(window.location.hash).toBe("#park-location");
      expect(scroll).toHaveBeenLastCalledWith({
        behavior: reducedMotion ? "instant" : "smooth",
        block: "start",
      });
      link.focus();
      await user.keyboard("{Enter}");
      expect(screen.getByTestId("map-request")).toHaveTextContent("known:2");
      await user.click(screen.getByRole("button", { name: "Piilota lisätiedot" }));
      expect(document.getElementById("visit-details-42")).toHaveAttribute("inert");
      vi.restoreAllMocks();
    },
  );
  it("renders the initial area details before client hydration and map loading", () => {
    const html = renderToString(
      <I18nProvider>
        <ParkLocation {...props} />
      </I18nProvider>,
    );
    expect(html).toContain("Puiston osoite");
    expect(html).toContain("Koko kohde");
    expect(html).not.toContain("Map single");
  });
  it.each([1, 14, 40])("keeps %i name-only choices available with area first", (count) => {
    const items = Array.from({ length: count }, (_, index) => ({
      ...trails[0],
      name: `Pitkä reitin nimi ${index}`,
      slug: `trail-${index}`,
    }));
    render(<ParkLocation {...props} linkedTrails={items} />, { wrapper: I18nProvider });
    const group = screen.getByRole("group", { name: "Karttavalinta" });
    const buttons = within(group).getAllByRole("button");
    expect(within(group).getByRole("heading", { name: `Reitit (${count})` })).toBeVisible();
    expect(buttons).toHaveLength(count + 1);
    expect(buttons[0]).toHaveAccessibleName("Koko kohde");
    expect(buttons[count]).toHaveAccessibleName(`Pitkä reitin nimi ${count - 1}`);
    expect(group).not.toHaveTextContent("2,5 km");
    expect(buttons[0].querySelector("svg")).toHaveClass("h-4", "w-4");
    expect(buttons[1].querySelector("svg")).toHaveClass("h-4", "w-4");
  });
  it("selects a map pick immediately and returns to the area", async () => {
    const user = userEvent.setup();
    render(<ParkLocation {...props} />, { wrapper: I18nProvider });
    const panel = screen.getByTestId("selection-details");
    await user.click(await screen.findByRole("button", { name: "Map single" }));
    expect(within(panel).getByText("Tunnettu reitti")).toBeInTheDocument();
    expect(screen.queryByText("Valitse reitti")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Map reset" }));
    expect(within(panel).getByText("Puiston osoite")).toBeInTheDocument();
  });
  it("preserves selection on reorder and clears it when the trail is removed", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ParkLocation {...props} />, { wrapper: I18nProvider });
    await user.click(screen.getByRole("button", { name: "Tunnettu reitti" }));
    expect(await screen.findByTestId("map-request")).toHaveTextContent("known:1");
    rerender(<ParkLocation {...props} linkedTrails={[...trails].reverse()} />);
    expect(
      within(screen.getByTestId("selection-details")).getByText("Tunnettu reitti"),
    ).toBeInTheDocument();
    rerender(<ParkLocation {...props} linkedTrails={trails.slice(1)} />);
    expect(
      within(screen.getByTestId("selection-details")).getByText("Puiston osoite"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("map-request")).toHaveTextContent("area:2");
    expect(screen.getByRole("status")).toHaveTextContent("Valittu: Koko kohde");
  });
  it("closes the mobile dialog and focuses the desktop list at the breakpoint", async () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
    let change: (() => void) | undefined;
    const media = {
      matches: false,
      addEventListener: (_event: string, handler: () => void) => {
        change = handler;
      },
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", () => media);
    try {
      const user = userEvent.setup();
      render(<ParkLocation {...props} />, { wrapper: I18nProvider });
      await user.click(screen.getByRole("button", { name: "Karttavalinta: Koko kohde" }));
      media.matches = true;
      act(() => change?.());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole("group", { name: "Karttavalinta" })).toHaveFocus(),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("opens and dismisses the mobile chooser without changing selection", async () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
    const user = userEvent.setup();
    render(
      <ParkLocation
        {...props}
        linkedAreas={[
          { id: 1, name: "Tunnettu reitti", slug: "same-name-area", boundaryGeoJson: geometry },
        ]}
      />,
      { wrapper: I18nProvider },
    );
    const opener = screen.getByRole("button", { name: "Karttavalinta: Koko kohde" });
    expect(opener).toHaveTextContent(/^Koko kohde$/);
    await user.click(opener);
    const dialog = screen.getByRole("dialog");
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    await user.click(opener);
    const sameNameChoices = within(screen.getByRole("dialog")).getAllByRole("button", {
      name: /^Tunnettu reitti$/,
    });
    await user.click(sameNameChoices[0]);
    expect(opener).toHaveTextContent(/^Alue: Tunnettu reitti$/);
    expect(opener).toHaveFocus();
    await user.click(opener);
    await user.click(
      within(screen.getByRole("dialog")).getAllByRole("button", {
        name: /^Tunnettu reitti$/,
      })[1],
    );
    expect(
      within(screen.getByTestId("selection-details")).getByText("Tunnettu reitti"),
    ).toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(opener).toHaveTextContent(/^Reitti: Tunnettu reitti$/);
  });
  it("switches one details panel between area and trail contents", async () => {
    const user = userEvent.setup();
    render(
      <ParkLocation
        boundaryGeoJson={geometry}
        boundingBox={{ minLat: 60, maxLat: 61, minLon: 24, maxLon: 25 }}
        markerPoint={{ lat: 60, lon: 24 }}
        parkName="Puisto"
        linkedTrails={trails}
        areaContent={
          <>
            <span>Puiston osoite</span>
            <a href="https://example.com">Verkkosivusto</a>
            <a href="https://example.com/map.pdf">Kartta PDF</a>
          </>
        }
      />,
      { wrapper: I18nProvider },
    );
    const panel = screen.getByTestId("selection-details");
    expect(within(panel).getByText("Puiston osoite")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Verkkosivusto" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tunnettu reitti" }));
    expect(screen.getAllByTestId("selection-details")).toHaveLength(1);
    expect(within(panel).getByText("Tunnettu reitti")).toBeInTheDocument();
    expect(within(panel).getByText("2,5 km")).toBeInTheDocument();
    expect(within(panel).getByText("Reitin osoite")).toBeInTheDocument();
    const trailBadge = within(panel).getByText("Tunnettu reitti").closest(".inline-flex");
    const addressBadge = within(panel).getByText("Reitin osoite").closest(".inline-flex");
    expect(trailBadge).toContainElement(within(panel).getByText("2,5 km"));
    expect(trailBadge?.querySelector(".lucide-route")).toBeInTheDocument();
    expect(addressBadge?.querySelector(".lucide-map-pin")).toBeInTheDocument();
    expect(trailBadge?.parentElement).toBe(addressBadge?.parentElement);
    expect(within(panel).queryByText("Puiston osoite")).not.toBeInTheDocument();
    expect(within(panel).queryByRole("link")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tuntematon reitti" }));
    expect(within(panel).getByText("Tuntematon reitti")).toBeInTheDocument();
    expect(within(panel).queryByText(/km|Pituus ei tiedossa/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Nollareitti" }));
    expect(within(panel).getByText("0 km")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Koko kohde" }));
    expect(within(panel).getByText("Puiston osoite")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Kartta PDF" })).toBeInTheDocument();
  });
});
