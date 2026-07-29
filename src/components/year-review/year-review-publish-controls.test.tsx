import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";
import { YearReviewPublishControls } from "./year-review-publish-controls";

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

describe("YearReviewPublishControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a draft state without public share actions", () => {
    render(
      <YearReviewPublishControls
        year={2026}
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
      publicUrl: "https://frontend.example/vuosikatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
      publishedAt: "2024-12-31T11:00:00Z",
      shareId: "93d27350-b7a4-48ba-a93f-16f38d44aa03",
      sharePath: "/vuosikatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
    });

    render(
      <YearReviewPublishControls
        year={2024}
        status="published"
        publishInfo={{
          publicUrl:
            "https://frontend.example/vuosikatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
          publishedAt: "2024-12-31T11:00:00Z",
          publishedShareId: "93d27350-b7a4-48ba-a93f-16f38d44aa03",
          sharePath: "/vuosikatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
        }}
      />,
    );

    expect(screen.getByText("publishedStatus")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "copyShareLink" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "openSharePage" })).toHaveAttribute(
      "href",
      "/vuosikatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
    );

    fireEvent.click(screen.getByRole("button", { name: "republish" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/year-review/2024/publish", {
        method: "POST",
      });
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("shows backend errors from unpublish requests", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(404, "missing"));

    render(
      <YearReviewPublishControls
        year={2024}
        status="published"
        publishInfo={{
          publicUrl:
            "https://frontend.example/vuosikatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
          publishedAt: "2024-12-31T11:00:00Z",
          publishedShareId: "93d27350-b7a4-48ba-a93f-16f38d44aa03",
          sharePath: "/vuosikatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "unpublish" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("missing");
    });
  });

  it("shows a generic publish error when the request throws a non-API error", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("boom"));

    render(
      <YearReviewPublishControls
        year={2026}
        status="draft"
        publishInfo={{
          publicUrl: null,
          publishedAt: null,
          publishedShareId: null,
          sharePath: null,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "publish" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("actionFailed");
    });
  });

  it("refreshes after a successful unpublish", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(
      <YearReviewPublishControls
        year={2024}
        status="published"
        publishInfo={{
          publicUrl:
            "https://frontend.example/vuosikatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
          publishedAt: "2024-12-31T11:00:00Z",
          publishedShareId: "93d27350-b7a4-48ba-a93f-16f38d44aa03",
          sharePath: "/vuosikatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "unpublish" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/api/year-review/2024/publish", {
        method: "DELETE",
      });
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("shows a generic unpublish error when the request throws a non-API error", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("boom"));

    render(
      <YearReviewPublishControls
        year={2024}
        status="published"
        publishInfo={{
          publicUrl:
            "https://frontend.example/vuosikatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
          publishedAt: "2024-12-31T11:00:00Z",
          publishedShareId: "93d27350-b7a4-48ba-a93f-16f38d44aa03",
          sharePath: "/vuosikatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "unpublish" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("actionFailed");
    });
  });
});
