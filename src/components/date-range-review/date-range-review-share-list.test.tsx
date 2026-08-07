import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";
import { DateRangeReviewShareList } from "./date-range-review-share-list";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    if (key === "summary") {
      return `summary:${values?.visitCount}:${values?.tripCount}:${values?.imageCount}`;
    }

    if (key === "publishedAt") {
      return `published:${values?.date ?? ""}`;
    }

    return key;
  },
}));

describe("DateRangeReviewShareList", () => {
  const confirmMock = vi.fn(() => true);
  const share = {
    generatedAt: "2026-08-01T10:00:00Z",
    overview: {
      endDate: "2026-07-28",
      name: "Kesaloma 2026",
      shareSlug: "kesaloma-2026",
      startDate: "2026-06-14",
    },
    publicUrl:
      "https://frontend.example/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
    publishedAt: "2026-08-01T11:00:00Z",
    shareId: "93d27350-b7a4-48ba-a93f-16f38d44aa03",
    sharePath: "/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
    storySummary: {
      distinctParkCount: 3,
      imageCount: 12,
      newNationalParkCount: 2,
      revisitedParkCount: 1,
      tripCount: 2,
      visitCount: 4,
    },
    updatedAt: "2026-08-01T11:00:00Z",
  } as const;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("confirm", confirmMock);
  });

  it("renders share actions including moving a share into preview", () => {
    render(<DateRangeReviewShareList shares={[share]} />);

    expect(screen.getByRole("heading", { name: "Kesaloma 2026" })).toBeInTheDocument();
    expect(screen.getByText("summary:4:2:12")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "moveToPreview" })).toHaveAttribute(
      "href",
      "/hallinta/ajanjaksokatsaus?tab=preview&endDate=2026-07-28&name=Kesaloma+2026&startDate=2026-06-14",
    );
    expect(screen.getByRole("link", { name: "openSharePage" })).toHaveAttribute(
      "href",
      "/ajanjaksokatsaus/jako/93d27350-b7a4-48ba-a93f-16f38d44aa03",
    );
  });

  it("removes a share after a successful delete", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(undefined);

    render(<DateRangeReviewShareList shares={[share]} />);

    fireEvent.click(screen.getByRole("button", { name: "removeShare" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/admin/date-range-review/shares/93d27350-b7a4-48ba-a93f-16f38d44aa03",
        {
          method: "DELETE",
        },
      );
      expect(screen.queryByRole("heading", { name: "Kesaloma 2026" })).not.toBeInTheDocument();
    });
  });

  it("shows backend errors when deleting a share fails", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(404, "missing"));

    render(<DateRangeReviewShareList shares={[share]} />);

    fireEvent.click(screen.getByRole("button", { name: "removeShare" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("missing");
    });
  });
});
