import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import { revalidatePublicCache } from "@/lib/public-cache";
import { HomeFeaturedVisitSettings } from "./home-featured-visit-settings";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/public-cache", () => ({ revalidatePublicCache: vi.fn() }));
const initialSelection = {
  visitId: null,
  candidates: [{ id: 12, park: { name: "Vernissa", slug: "vernissa" }, visitedOn: "2026-09-12" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiFetch).mockResolvedValue({ visitId: 12 });
  vi.mocked(revalidatePublicCache).mockResolvedValue(true);
});

describe("HomeFeaturedVisitSettings", () => {
  it("saves and clears an admin selection and expires the home cache", async () => {
    const user = userEvent.setup();
    render(<HomeFeaturedVisitSettings initialSelection={initialSelection} />);
    const radio = screen.getByRole("radio", { name: /Vernissa/ });
    const save = screen.getByRole("button", { name: "controlPanel.dashboard.featuredVisit.save" });
    expect(save).toBeDisabled();
    await user.click(radio);
    await user.click(save);
    await waitFor(() =>
      expect(screen.getByText("controlPanel.dashboard.featuredVisit.saved")).toHaveTextContent(
        "controlPanel.dashboard.featuredVisit.saved",
      ),
    );
    expect(apiFetch).toHaveBeenCalledWith("/api/admin/home-featured-visit", {
      method: "PATCH",
      body: JSON.stringify({ visitId: 12 }),
    });
    expect(revalidatePublicCache).toHaveBeenCalledWith({ expireImmediately: true });
    await user.click(
      screen.getByRole("button", { name: "controlPanel.dashboard.featuredVisit.clear" }),
    );
    vi.mocked(apiFetch).mockResolvedValueOnce({ visitId: null });
    await user.click(save);
    await waitFor(() =>
      expect(apiFetch).toHaveBeenLastCalledWith("/api/admin/home-featured-visit", {
        method: "PATCH",
        body: JSON.stringify({ visitId: null }),
      }),
    );
  });
  it("locks the form during save and cache refresh without losing its selection", async () => {
    let finishSave: (value: { visitId: number }) => void = () => {};
    vi.mocked(apiFetch).mockReturnValueOnce(
      new Promise((resolve) => {
        finishSave = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<HomeFeaturedVisitSettings initialSelection={initialSelection} />);
    const radio = screen.getByRole("radio", { name: /Vernissa/ });
    await user.click(radio);
    await user.click(
      screen.getByRole("button", { name: "controlPanel.dashboard.featuredVisit.save" }),
    );
    expect(radio).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "controlPanel.dashboard.featuredVisit.saving" }),
    ).toBeDisabled();
    expect(radio).toBeChecked();
    finishSave({ visitId: 12 });
    await waitFor(() =>
      expect(screen.getByText("controlPanel.dashboard.featuredVisit.saved")).toHaveTextContent(
        "controlPanel.dashboard.featuredVisit.saved",
      ),
    );
    expect(radio).toBeEnabled();
  });
  it("keeps the selection editable after save failure and allows retry", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("Network unavailable"));
    const user = userEvent.setup();
    render(<HomeFeaturedVisitSettings initialSelection={initialSelection} />);
    await user.click(screen.getByRole("radio", { name: /Vernissa/ }));
    await user.click(
      screen.getByRole("button", { name: "controlPanel.dashboard.featuredVisit.save" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "controlPanel.dashboard.featuredVisit.saveFailed",
    );
    expect(revalidatePublicCache).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "controlPanel.dashboard.featuredVisit.save" }),
    );
    await waitFor(() =>
      expect(screen.getByText("controlPanel.dashboard.featuredVisit.saved")).toHaveTextContent(
        "controlPanel.dashboard.featuredVisit.saved",
      ),
    );
  });
  it("reports cache failure after persistence and retries refreshing without another write", async () => {
    vi.mocked(revalidatePublicCache).mockResolvedValueOnce(false);
    const user = userEvent.setup();
    render(<HomeFeaturedVisitSettings initialSelection={initialSelection} />);
    await user.click(screen.getByRole("radio", { name: /Vernissa/ }));
    await user.click(
      screen.getByRole("button", { name: "controlPanel.dashboard.featuredVisit.save" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "controlPanel.dashboard.featuredVisit.cacheFailed",
    );
    await user.click(
      screen.getByRole("button", { name: "controlPanel.dashboard.featuredVisit.retryCache" }),
    );
    await waitFor(() =>
      expect(screen.getByText("controlPanel.dashboard.featuredVisit.saved")).toHaveTextContent(
        "controlPanel.dashboard.featuredVisit.saved",
      ),
    );
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
  it("allows clearing an unavailable saved visit and keeps an empty candidate list usable", async () => {
    render(<HomeFeaturedVisitSettings initialSelection={{ visitId: 99, candidates: [] }} />);
    expect(
      screen.getByText("controlPanel.dashboard.featuredVisit.unavailable"),
    ).toBeInTheDocument();
    expect(screen.getByText("controlPanel.dashboard.featuredVisit.empty")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "controlPanel.dashboard.featuredVisit.clear" }),
    );
    expect(
      screen.getByRole("button", { name: "controlPanel.dashboard.featuredVisit.save" }),
    ).toBeEnabled();
  });
  it("searches names and Finnish/ISO dates while keeping the selection visible", async () => {
    const user = userEvent.setup();
    render(
      <HomeFeaturedVisitSettings
        initialSelection={{
          visitId: 12,
          candidates: [
            ...initialSelection.candidates,
            {
              id: 13,
              park: { name: "Nuuksion kansallispuisto", slug: "nuuksio" },
              visitedOn: "2025-06-12",
            },
            {
              id: 14,
              park: { name: "Nuuksion kansallispuisto", slug: "nuuksio" },
              visitedOn: "2024-06-12",
            },
          ],
        }}
      />,
    );
    const search = screen.getByRole("searchbox", {
      name: "controlPanel.dashboard.featuredVisit.searchLabel",
    });
    const selected = screen.getByRole("region", {
      name: "controlPanel.dashboard.featuredVisit.selectedTitle",
    });
    expect(within(selected).getByText("Vernissa")).toBeInTheDocument();
    await user.type(search, "NUUKSIO 2025");
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    expect(screen.getByRole("radio", { name: /12.6.2025/ })).toBeInTheDocument();
    expect(within(selected).getByText("Vernissa")).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(apiFetch).not.toHaveBeenCalled();
    await user.clear(search);
    await user.type(search, "12.9.2026");
    expect(screen.getByRole("radio", { name: /Vernissa/ })).toBeChecked();
    await user.clear(search);
    await user.type(search, "2024-06-12");
    await user.click(screen.getByRole("radio", { name: /12.6.2024/ }));
    expect(within(selected).getByText("Nuuksion kansallispuisto")).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "no match");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText("controlPanel.dashboard.featuredVisit.noResults")).toBeInTheDocument();
    expect(within(selected).getByText("Nuuksion kansallispuisto")).toBeInTheDocument();
    await user.clear(search);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("shows ten recent visits at a time and resets the batch when searching", async () => {
    const candidates = Array.from({ length: 23 }, (_, index) => ({
      id: index + 1,
      park: { name: `Paikka ${index + 1}`, slug: `paikka-${index + 1}` },
      visitedOn: `2026-09-${String(30 - index).padStart(2, "0")}`,
    }));
    const user = userEvent.setup();
    render(<HomeFeaturedVisitSettings initialSelection={{ visitId: null, candidates }} />);
    expect(screen.getAllByRole("radio")).toHaveLength(10);
    const more = screen.getByRole("button", {
      name: "controlPanel.dashboard.featuredVisit.showMore",
    });
    await user.click(more);
    expect(screen.getAllByRole("radio")).toHaveLength(20);
    await user.click(more);
    expect(screen.getAllByRole("radio")).toHaveLength(23);
    expect(more).toBeDisabled();
    const search = screen.getByRole("searchbox");
    await user.type(search, "  ");
    expect(screen.getAllByRole("radio")).toHaveLength(10);
    expect(more).toBeEnabled();
    await user.clear(search);
    await user.type(search, "paikka 23 2026-09-08");
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: "controlPanel.dashboard.featuredVisit.showMore" }),
    ).not.toBeInTheDocument();
    await user.clear(search);
    expect(screen.getAllByRole("radio")).toHaveLength(10);
  });

  it("supports keyboard selection and clearing with native controls", async () => {
    const user = userEvent.setup();
    render(
      <HomeFeaturedVisitSettings
        initialSelection={{
          ...initialSelection,
          candidates: [
            ...initialSelection.candidates,
            { id: 13, park: { name: "Evo", slug: "evo" }, visitedOn: "2026-09-19" },
          ],
        }}
      />,
    );
    const first = screen.getByRole("radio", { name: /Vernissa/ });
    first.focus();
    await user.keyboard(" ");
    expect(first).toBeChecked();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: /Evo/ })).toBeChecked();
    const clear = screen.getByRole("button", {
      name: "controlPanel.dashboard.featuredVisit.clear",
    });
    clear.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("controlPanel.dashboard.featuredVisit.none")).toBeInTheDocument();
    expect(clear).toBeDisabled();
  });
});
