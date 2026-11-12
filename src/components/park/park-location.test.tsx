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
    expect(html).toContain("Koko alue");
    expect(html).not.toContain("Map single");
  });
  it.each([1, 14, 40])("keeps %i name-only choices available with area first", (count) => {
    const items = Array.from({ length: count }, (_, index) => ({
      ...trails[0],
      name: `Pitkä reitin nimi ${index}`,
      slug: `trail-${index}`,
    }));
    render(<ParkLocation {...props} linkedTrails={items} />, { wrapper: I18nProvider });
    const group = screen.getByRole("group", { name: `Reitit (${count})` });
    const buttons = within(group).getAllByRole("button");
    expect(buttons).toHaveLength(count + 1);
    expect(buttons[0]).toHaveAccessibleName("Koko alue");
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
    expect(screen.getByRole("status")).toHaveTextContent("Valittu: Koko alue");
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
      await user.click(screen.getByRole("button", { name: "Reitit (3): Koko alue" }));
      media.matches = true;
      act(() => change?.());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByRole("group", { name: "Reitit (3)" })).toHaveFocus());
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
    render(<ParkLocation {...props} />, { wrapper: I18nProvider });
    const opener = screen.getByRole("button", { name: "Reitit (3): Koko alue" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog");
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    await user.click(opener);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Tunnettu reitti" }),
    );
    expect(
      within(screen.getByTestId("selection-details")).getByText("Tunnettu reitti"),
    ).toBeInTheDocument();
    expect(opener).toHaveFocus();
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
    await user.click(screen.getByRole("button", { name: "Koko alue" }));
    expect(within(panel).getByText("Puiston osoite")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Kartta PDF" })).toBeInTheDocument();
  });
});
