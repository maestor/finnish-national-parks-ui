import {
  act,
  fireEvent,
  render as renderTestingLibrary,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SnackbarProvider } from "@/components/providers/snackbar-provider";
import type { ParkImageSelection } from "@/lib/parks";
import { revalidatePublicCache } from "@/lib/public-cache";
import { ParkFeaturedImageSection } from "./park-featured-image-section";

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));

vi.mock("@/lib/api", () => ({ apiFetch: mockApiFetch }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const render = (ui: Parameters<typeof renderTestingLibrary>[0]) =>
  renderTestingLibrary(<SnackbarProvider>{ui}</SnackbarProvider>);

const candidate: ParkImageSelection = {
  image: {
    createdAt: "2026-06-07T09:00:00Z",
    displayOrder: 0,
    fullHeight: 1000,
    fullUrl: "https://example.com/full.jpg",
    fullWidth: 1500,
    id: 10,
    originalName: "featured.jpg",
    thumbHeight: 200,
    thumbUrl: "https://example.com/thumb.jpg",
    thumbWidth: 300,
  },
  isPubliclyVisible: true,
  reference: { imageId: 10, source: "visit-image" },
  sourceId: 4,
  sourceLabel: "Kansallispuisto",
  visitedOn: "2026-06-07",
};

vi.mock("@/lib/public-cache", () => ({ revalidatePublicCache: vi.fn(async () => true) }));

describe("ParkFeaturedImageSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockReset();
    HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function close(this: HTMLDialogElement) {
      this.open = false;
    });
  });
  it("chooses a visit photo independently, refreshes the park cache, and removes it", async () => {
    mockApiFetch
      .mockResolvedValueOnce({ featuredImage: null, hasImages: true })
      .mockResolvedValueOnce({ images: [candidate], nextOffset: null })
      .mockResolvedValueOnce({ featuredImage: candidate, hasImages: true })
      .mockResolvedValueOnce({ featuredImage: null, hasImages: true });
    render(<ParkFeaturedImageSection slug="pallas" />);
    fireEvent.click(await screen.findByRole("button", { name: "choose" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Kansallispuisto, 2026-06-07, featured/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mockApiFetch).toHaveBeenCalledWith("/api/admin/parks/pallas/featured-image", {
      body: JSON.stringify({ featuredImage: candidate.reference }),
      method: "PATCH",
    });
    expect(revalidatePublicCache).toHaveBeenCalledWith({
      parkSlug: "pallas",
      expireImmediately: true,
    });
    fireEvent.click(screen.getByRole("button", { name: "remove" }));
    await waitFor(() => expect(screen.getByText("empty")).toBeInTheDocument());
    expect(mockApiFetch).toHaveBeenLastCalledWith("/api/admin/parks/pallas/featured-image", {
      body: JSON.stringify({ featuredImage: null }),
      method: "PATCH",
    });
  });
  it("omits the entire cover section when published visits have no images", async () => {
    mockApiFetch.mockResolvedValueOnce({ featuredImage: null, hasImages: false });
    await act(async () => {
      render(<ParkFeaturedImageSection slug="pallas" />);
    });
    expect(screen.queryByRole("heading", { name: "title" })).toBeNull();
    expect(screen.queryByRole("button", { name: "choose" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mockApiFetch).toHaveBeenCalledOnce();
  });
  it("offers retry after a failed initial read", async () => {
    mockApiFetch
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ featuredImage: null, hasImages: true });
    render(<ParkFeaturedImageSection slug="pallas" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("loadFailed");
    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    expect(await screen.findByRole("button", { name: "choose" })).toBeInTheDocument();
  });
  it("preserves the selection after failed removal and lets cache refresh retry without another write", async () => {
    vi.mocked(revalidatePublicCache).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mockApiFetch
      .mockResolvedValueOnce({ featuredImage: candidate, hasImages: true })
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ featuredImage: null, hasImages: true });
    render(<ParkFeaturedImageSection slug="pallas" />);
    fireEvent.click(await screen.findByRole("button", { name: "remove" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("removeFailed");
    expect(screen.getByRole("button", { name: "change" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "remove" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("refreshFailed");
    const writes = mockApiFetch.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "retryRefresh" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(mockApiFetch).toHaveBeenCalledTimes(writes);
  });

  it("ignores a late read after leaving the page", async () => {
    let resolve!: (value: { featuredImage: null; hasImages: true }) => void;
    mockApiFetch.mockReturnValueOnce(
      new Promise<{ featuredImage: null; hasImages: true }>((done) => {
        resolve = done;
      }),
    );
    const { unmount } = render(<ParkFeaturedImageSection slug="pallas" />);
    expect(screen.queryByRole("heading", { name: "title" })).toBeNull();
    unmount();
    resolve({ featuredImage: null, hasImages: true });
    await Promise.resolve();
    expect(screen.queryByRole("button", { name: "choose" })).toBeNull();
  });
});
