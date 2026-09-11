import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicTripArchiveResponse } from "@/lib/public-trips";
import { TripArchiveList } from "./trip-archive-list";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

class MockIntersectionObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
}

const createTrip = (id: number) => ({
  createdAt: `2024-06-${String(id).padStart(2, "0")}T10:00:00Z`,
  dateRange: {
    end: `2024-06-${String(id).padStart(2, "0")}`,
    start: `2024-06-${String(id).padStart(2, "0")}`,
  },
  descriptionExcerpt: null,
  featuredImage: null,
  id,
  name: `Retki ${id}`,
  slug: `retki-${id}`,
  stopCount: 0,
  visitCount: 1,
});

const createResponse = (ids: number[], nextCursor: string | null): PublicTripArchiveResponse => ({
  nextCursor,
  total: 3,
  trips: ids.map(createTrip),
});

describe("TripArchiveList", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    sessionStorage.clear();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  it("renders the server-provided first batch without a client request", () => {
    render(<TripArchiveList initialResponse={createResponse([1, 2], null)} />);

    expect(screen.getByRole("heading", { name: "Retki 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Retki 2" })).toBeInTheDocument();
    expect(screen.getByRole("list").parentElement).toHaveClass("flex", "flex-col", "gap-5");
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("retries an initial failure", async () => {
    apiFetchMock.mockResolvedValueOnce(createResponse([1], null));
    const user = userEvent.setup();
    render(<TripArchiveList initialResponse={null} />);

    expect(screen.getByRole("alert")).toHaveTextContent("tripsArchive.loadFailed");
    await user.click(screen.getByRole("button", { name: "tripsArchive.retry" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Retki 1" })).toBeInTheDocument();
    });
    expect(apiFetchMock).toHaveBeenCalledWith("/api/trips/archive?limit=12", {
      signal: expect.any(AbortSignal),
    });
  });

  it("appends a page, deduplicates ids and exposes a later-page retry", async () => {
    apiFetchMock
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce(createResponse([2, 3], null));
    const user = userEvent.setup();
    render(<TripArchiveList initialResponse={createResponse([1, 2], "next-cursor")} />);

    await user.click(screen.getByRole("button", { name: "tripsArchive.loadMore" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("tripsArchive.loadMoreFailed");
    });

    await user.click(screen.getByRole("button", { name: "tripsArchive.retry" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Retki 3" })).toBeInTheDocument();
    });
    expect(screen.getAllByRole("heading")).toHaveLength(3);
    expect(screen.getByText("tripsArchive.allShown")).toBeInTheDocument();
  });
});
