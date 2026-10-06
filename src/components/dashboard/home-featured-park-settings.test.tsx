import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { revalidatePublicCache } from "@/lib/public-cache";
import { HomeFeaturedParkSettings } from "./home-featured-park-settings";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/public-cache", () => ({ revalidatePublicCache: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiFetch).mockResolvedValue({ parkSlug: "nuuksio" });
  vi.mocked(revalidatePublicCache).mockResolvedValue(true);
});

it("selects a repeatedly visited park by keyboard, keeps it through search, saves and clears it", async () => {
  const user = userEvent.setup();
  render(
    <HomeFeaturedParkSettings
      initialSelection={{
        parkSlug: null,
        candidates: [
          { name: "Nuuksio", slug: "nuuksio", visitCount: 2 },
          { name: "Repovesi", slug: "repovesi", visitCount: 3 },
        ],
      }}
    />,
  );
  const radio = screen.getByRole("radio", { name: /Nuuksio/ });
  radio.focus();
  await user.keyboard(" ");
  expect(radio).toBeChecked();
  await user.type(
    screen.getByRole("searchbox", { name: "controlPanel.dashboard.featuredPark.searchLabel" }),
    "REPO",
  );
  expect(screen.getByText("Nuuksio")).toBeVisible();
  expect(screen.getAllByRole("radio")).toHaveLength(1);
  await user.click(
    screen.getByRole("button", { name: "controlPanel.dashboard.featuredPark.save" }),
  );
  await waitFor(() =>
    expect(screen.getByText("controlPanel.dashboard.featuredPark.saved")).toBeVisible(),
  );
  expect(apiFetch).toHaveBeenLastCalledWith("/api/admin/home-featured-park", {
    method: "PATCH",
    body: JSON.stringify({ parkSlug: "nuuksio" }),
  });
  expect(revalidatePublicCache).toHaveBeenCalledWith({ expireImmediately: true });
  await user.click(
    screen.getByRole("button", { name: "controlPanel.dashboard.featuredPark.clear" }),
  );
  await user.click(
    screen.getByRole("button", { name: "controlPanel.dashboard.featuredPark.save" }),
  );
  await waitFor(() =>
    expect(apiFetch).toHaveBeenLastCalledWith("/api/admin/home-featured-park", {
      method: "PATCH",
      body: JSON.stringify({ parkSlug: null }),
    }),
  );
});

it("lets admins clear a saved park that has become ineligible", async () => {
  const user = userEvent.setup();
  render(<HomeFeaturedParkSettings initialSelection={{ parkSlug: "hidden", candidates: [] }} />);
  expect(screen.getByText("controlPanel.dashboard.featuredPark.unavailable")).toBeVisible();
  expect(screen.getByText("controlPanel.dashboard.featuredPark.empty")).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "controlPanel.dashboard.featuredPark.clear" }),
  );
  await user.click(
    screen.getByRole("button", { name: "controlPanel.dashboard.featuredPark.save" }),
  );
  await waitFor(() =>
    expect(apiFetch).toHaveBeenCalledWith("/api/admin/home-featured-park", {
      method: "PATCH",
      body: JSON.stringify({ parkSlug: null }),
    }),
  );
});
