import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";
import { revalidatePublicCache } from "@/lib/public-cache";
import { I18nProvider } from "@/test/i18n";
import { ParkAreas } from "./park-areas";

vi.unmock("next-intl");
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  apiFetch: vi.fn(),
}));
vi.mock("@/lib/public-cache", () => ({ revalidatePublicCache: vi.fn(async () => true) }));

const area = { id: 3, slug: "langinkoski", name: "Langinkoski", active: true, removed: true };
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

it("adds an active hidden area and keeps it linked when a draft visit blocks removal", async () => {
  vi.mocked(apiFetch)
    .mockResolvedValueOnce({ areas: [{ ...area, blockedBy: null }], nextOffset: null })
    .mockResolvedValueOnce(area)
    .mockRejectedValueOnce(
      new ApiError(409, "Conflict", {
        code: "AREA_ASSIGNED_TO_VISITS",
        visits: [{ id: 7, visitedOn: "2026-11-28", parkSlug: "kotka" }],
      }),
    )
    .mockResolvedValueOnce(area);
  const user = userEvent.setup();
  render(<ParkAreas slug="kotka" initialAreas={[]} />, { wrapper: I18nProvider });
  const search = screen.getByRole("searchbox", { name: "Hae lisättävää aluetta" });
  await user.type(search, "Langinkoski{Enter}");
  expect(await screen.findByText("Aktiivinen, piilotettu erillisenä paikkana")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Lisää alue Langinkoski" }));
  expect(await screen.findByRole("link", { name: "Langinkoski" })).toBeVisible();
  expect(revalidatePublicCache).toHaveBeenCalledWith({
    expireImmediately: true,
    parkSlugs: ["kotka", "langinkoski"],
  });

  await user.click(screen.getByRole("button", { name: "Poista alue Langinkoski" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("on valittuna käynneissä");
  expect(screen.getByRole("link", { name: "Muokkaa käyntiä 28.11.2026" })).toHaveAttribute(
    "href",
    "/hallinta/kaynnit/7/muokkaa",
  );
  expect(screen.getByRole("link", { name: "Langinkoski" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Poista alue Langinkoski" }));
  await waitFor(() =>
    expect(screen.queryByRole("link", { name: "Langinkoski" })).not.toBeInTheDocument(),
  );
});
