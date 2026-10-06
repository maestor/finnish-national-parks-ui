import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/test/i18n";
import { AppBreadcrumbs } from "./app-breadcrumbs";

vi.unmock("next-intl");

describe("page breadcrumbs", () => {
  it("gives a direct-entry visitor real parents and the loaded park name", async () => {
    render(<AppBreadcrumbs path="/paikka/evo" entityName="Evon retkeilyalue" />, {
      wrapper: I18nProvider,
    });
    const trail = screen.getByRole("navigation", { name: "Murupolku" });
    expect(within(trail).getByRole("link", { name: "Reissuvihko" })).toHaveAttribute("href", "/");
    expect(within(trail).getByRole("link", { name: "Paikat" })).toHaveAttribute("href", "/paikat");
    expect(within(trail).getByText("Evon retkeilyalue")).toHaveAttribute("aria-current", "page");
    expect(within(trail).getAllByRole("listitem")).toHaveLength(3);
    await userEvent.tab();
    expect(within(trail).getByRole("link", { name: "Reissuvihko" })).toHaveFocus();
  });

  it.each([
    "/",
    "/paikat",
    "/parks",
    "/kirjaudu",
    "/login",
    "/~offline",
    "/auth/dev-login",
    "/vuosikatsaus/jako/token",
    "/ajanjaksokatsaus/jako/token",
    "/hallinta/retket/42",
    "/paikat/unknown",
  ])("reserves no breadcrumb space on %s", (path) => {
    const { container } = render(<AppBreadcrumbs path={path} />, { wrapper: I18nProvider });
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["/kaynnit", "Käynnit", "/"],
    ["/visits", "Käynnit", "/"],
    ["/retket", "Retket", "/"],
    ["/trips?year=2026", "Retket", "/"],
    ["/reissusuunnittelu", "Reitit", "/"],
    ["/trip-planner", "Reitit", "/"],
    ["/hallinta", "Hallinta", "/"],
    ["/control-panel", "Hallinta", "/"],
    ["/hallinta/paikat", "Paikat", "/hallinta"],
    ["/hallinta/retket", "Retket", "/hallinta"],
    ["/hallinta/kaynnit", "Käynnit", "/hallinta"],
    ["/hallinta/ajanjaksokatsaus", "Ajanjaksokatsaus", "/hallinta"],
    ["/hallinta/vuosikatsaus", "Vuosikatsaus", "/hallinta"],
    ["/hallinta/kayttajat", "Ylläpitäjät", "/hallinta"],
    ["/hallinta/retket/uusi", "Uusi retki", "/hallinta/retket"],
    ["/control-panel/visits/new", "Uusi käynti", "/hallinta/kaynnit"],
    ["/hallinta/retket/42/muokkaa", "Muokkaa retkeä", "/hallinta/retket"],
    ["/control-panel/visits/42/edit", "Muokkaa käyntiä", "/hallinta/kaynnit"],
    ["/hallinta/retket/42/esikatselu", "Esikatselu", "/hallinta/retket/42/muokkaa"],
    ["/control-panel/visits/42/preview", "Esikatselu", "/hallinta/kaynnit/42/muokkaa"],
  ])("renders the current label and immediate parent for %s", (path, current, parent) => {
    render(<AppBreadcrumbs path={path} />, { wrapper: I18nProvider });
    const trail = screen.getByRole("navigation", { name: "Murupolku" });
    expect(within(trail).getByText(current)).toHaveAttribute("aria-current", "page");
    const links = within(trail).getAllByRole("link");
    expect(links.at(-1)).toHaveAttribute("href", parent);
    expect(trail.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it.each(["/trip/syysretki", "/retki/syysretki"])("uses a trip's saved title on %s", (path) => {
    render(<AppBreadcrumbs path={path} entityName="Syysretki Evolle 2026" />, {
      wrapper: I18nProvider,
    });
    expect(screen.getByText("Syysretki Evolle 2026")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Retket" })).toHaveAttribute("href", "/retket");
  });

  it("keeps an admin park name as context and its real section parent reachable", () => {
    render(<AppBreadcrumbs path="/control-panel/parks/evo/edit" entityName="Evon retkeilyalue" />, {
      wrapper: I18nProvider,
    });
    expect(screen.getByText("Evon retkeilyalue").closest("a")).toBeNull();
    expect(screen.getByText("Muokkaa")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Paikat" })).toHaveAttribute(
      "href",
      "/hallinta/paikat",
    );
    expect(screen.queryByRole("link", { name: "Reissuvihko" })).not.toBeInTheDocument();
  });

  it("keeps a long Finnish title readable as current text and preserves all ancestors", () => {
    const title = "Koivukylästä pikkuteitä Kotkaan ja takaisin kansallispuistojen kautta 2026";
    render(<AppBreadcrumbs path="/retki/koivukyla-kotka" entityName={title} />, {
      wrapper: I18nProvider,
    });
    const trail = screen.getByRole("navigation", { name: "Murupolku" });
    expect(within(trail).getByText(title)).toHaveAttribute("aria-current", "page");
    expect(within(trail).getAllByRole("link")).toHaveLength(2);
    expect(within(trail).getAllByRole("listitem")).toHaveLength(3);
  });
});
