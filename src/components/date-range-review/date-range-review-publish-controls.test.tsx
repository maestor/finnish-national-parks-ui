import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";
import { DateRangeReviewPublishControls } from "./date-range-review-publish-controls";

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    if (key === "publishedAt") {
      return `Julkaistu ${values?.date ?? ""}`;
    }

    return key;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

describe("DateRangeReviewPublishControls", () => {
  const overview = {
    endDate: "2026-07-28",
    name: "Kesaloma 2026",
    shareSlug: "kesaloma-2026",
    startDate: "2026-06-14",
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a draft state without public share actions", () => {
    render(
      <DateRangeReviewPublishControls
        overview={overview}
        status="draft"
        publishInfo={{
          publicUrl: null,
          publishedAt: null,
          publishedShareId: null,
          sharePath: null,
        }}
      />,
    );

    expect(screen.getByText("draftStatus")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "publish" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "unpublish" })).not.toBeInTheDocument();
  });

  it("renders a published state and refreshes after republishing", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      overview,
      publicUrl:
        "https://frontend.example/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
      publishedAt: "2026-08-01T11:00:00Z",
      shareId: "93d27350-b7a4-48ba-a93f-16f38d44aa03",
      sharePath: "/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
    });

    render(
      <DateRangeReviewPublishControls
        overview={overview}
        status="published"
        publishInfo={{
          publicUrl:
            "https://frontend.example/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
          publishedAt: "2026-08-01T11:00:00Z",
          publishedShareId: "93d27350-b7a4-48ba-a93f-16f38d44aa03",
          sharePath: "/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
        }}
      />,
    );

    expect(screen.getByText("publishedStatus")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "copyShareLink" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "openSharePage" })).toHaveAttribute(
      "href",
      "/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
    );

    fireEvent.click(screen.getByRole("button", { name: "republish" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/date-range-review/publish", {
        body: JSON.stringify({
          endDate: "2026-07-28",
          name: "Kesaloma 2026",
          startDate: "2026-06-14",
        }),
        method: "POST",
      });
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("shows backend errors from unpublish requests", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(404, "missing"));

    render(
      <DateRangeReviewPublishControls
        overview={overview}
        status="published"
        publishInfo={{
          publicUrl:
            "https://frontend.example/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
          publishedAt: "2026-08-01T11:00:00Z",
          publishedShareId: "93d27350-b7a4-48ba-a93f-16f38d44aa03",
          sharePath: "/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "unpublish" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("missing");
    });
  });

  it("refreshes after a successful unpublish", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(
      <DateRangeReviewPublishControls
        overview={overview}
        status="published"
        publishInfo={{
          publicUrl:
            "https://frontend.example/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
          publishedAt: "2026-08-01T11:00:00Z",
          publishedShareId: "93d27350-b7a4-48ba-a93f-16f38d44aa03",
          sharePath: "/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "unpublish" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/date-range-review/publish?name=Kesaloma+2026", {
        method: "DELETE",
      });
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
