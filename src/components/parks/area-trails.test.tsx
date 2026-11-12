import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";
import { revalidatePublicCache } from "@/lib/public-cache";
import { AreaTrails } from "./area-trails";

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  apiFetch: vi.fn(),
}));
vi.mock("@/lib/public-cache", () => ({ revalidatePublicCache: vi.fn(async () => true) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

const linked = {
  trailId: 1,
  name: "Polku",
  slug: "polku",
  effective: true,
  automaticMatch: true,
  override: null,
  overlapMetres: null,
  routeMetres: null,
  overlapRatio: null,
  calculationMethod: null,
  geometryFingerprint: null,
  geometryQuality: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

it("keeps a visited trail linked and offers the blocking visits for review", async () => {
  vi.mocked(apiFetch).mockRejectedValueOnce(
    new ApiError(409, "Conflict", {
      code: "TRAIL_HAS_VISITS",
      visits: [{ id: 42, visitedOn: "2026-11-12" }],
    }),
  );
  render(<AreaTrails slug="alue" initialTrails={[linked]} />);
  fireEvent.click(screen.getByRole("button", { name: /removeLabel/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent("visitsPreventRemove");
  expect(screen.getByRole("link", { name: "12.11.2026" })).toHaveAttribute(
    "href",
    "/hallinta/kaynnit/42/muokkaa",
  );
  expect(screen.getByRole("link", { name: "Polku" })).toBeInTheDocument();
  expect(revalidatePublicCache).not.toHaveBeenCalled();
});

it("lets an admin search, include and exclude a trail while refreshing public caches", async () => {
  vi.mocked(apiFetch)
    .mockResolvedValueOnce({
      trails: [{ trailId: 2, name: "Uusi polku", slug: "uusi" }],
      nextOffset: null,
    })
    .mockResolvedValueOnce({
      ...linked,
      trailId: 2,
      name: "Uusi polku",
      slug: "uusi",
      override: "include",
    })
    .mockResolvedValueOnce({ ...linked, override: "exclude", effective: false });
  render(<AreaTrails slug="alue" initialTrails={[linked]} />);
  expect(screen.getByRole("link", { name: "Polku" })).toHaveAttribute(
    "href",
    "/hallinta/paikat/polku/muokkaa",
  );
  fireEvent.change(screen.getByRole("searchbox", { name: "searchLabel" }), {
    target: { value: "Uusi" },
  });
  fireEvent.click(screen.getByRole("button", { name: "search" }));
  const candidate = await screen.findByText("Uusi polku");
  fireEvent.click(
    within(candidate.parentElement as HTMLElement).getByRole("button", { name: /add/ }),
  );
  await waitFor(() => expect(screen.getByRole("link", { name: "Uusi polku" })).toBeInTheDocument());
  expect(apiFetch).toHaveBeenCalledWith("/api/admin/parks/alue/trails/2", { method: "PUT" });
  expect(revalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "alue", expireImmediately: true });
  expect(revalidatePublicCache).toHaveBeenCalledWith({ parkSlug: "uusi", expireImmediately: true });
  fireEvent.click(
    within(screen.getByRole("link", { name: "Polku" }).parentElement as HTMLElement).getByRole(
      "button",
      {
        name: /remove/,
      },
    ),
  );
  await waitFor(() =>
    expect(screen.queryByRole("link", { name: "Polku" })).not.toBeInTheDocument(),
  );
  expect(apiFetch).toHaveBeenCalledWith("/api/admin/parks/alue/trails/1", { method: "DELETE" });
});

it("shows failures and allows a failed cache refresh to be retried", async () => {
  vi.mocked(apiFetch)
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({
      trails: [{ trailId: 2, name: "Uusi polku", slug: "uusi" }],
      nextOffset: null,
    })
    .mockRejectedValueOnce(
      new Error("Trail has visits and requires a preservation decision before conversion."),
    )
    .mockResolvedValueOnce({ ...linked, trailId: 2, name: "Uusi polku", slug: "uusi" });
  vi.mocked(revalidatePublicCache).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<AreaTrails slug="alue" initialTrails={[]} />);
  expect(screen.getByText("empty")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "search" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("searchFailed");
  fireEvent.click(screen.getByRole("button", { name: "search" }));
  fireEvent.click(await screen.findByRole("button", { name: "addLabel" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("visitsPreventAdd");
  fireEvent.click(screen.getByRole("button", { name: "addLabel" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("refreshFailed");
  expect(screen.getByRole("link", { name: "Uusi polku" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "retryRefresh" }));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  expect(apiFetch).toHaveBeenCalledTimes(4);
});

it("paginates a search and leaves links unchanged when confirmation is canceled", async () => {
  vi.mocked(apiFetch)
    .mockResolvedValueOnce({
      trails: [{ trailId: 2, name: "Ensimmäinen", slug: "eka" }],
      nextOffset: 25,
    })
    .mockResolvedValueOnce({
      trails: [{ trailId: 3, name: "Toinen", slug: "toka" }],
      nextOffset: null,
    });
  vi.mocked(window.confirm).mockReturnValue(false);
  render(<AreaTrails slug="alue" initialTrails={[]} />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "polku" } });
  fireEvent.click(screen.getByRole("button", { name: "search" }));
  expect(await screen.findByText("Ensimmäinen")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "more" }));
  expect(await screen.findByText("Toinen")).toBeInTheDocument();
  expect(screen.getByText("Ensimmäinen")).toBeInTheDocument();
  expect(apiFetch).toHaveBeenLastCalledWith(
    "/api/admin/parks/alue/trail-candidates?q=polku&offset=25&limit=25",
  );
  fireEvent.click(screen.getAllByRole("button", { name: "addLabel" })[0]);
  expect(apiFetch).toHaveBeenCalledTimes(2);
});
