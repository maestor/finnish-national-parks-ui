import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiAuthFetch, apiFetch } from "./api";
import {
  buildDateRangeReviewShareDescription,
  fetchDateRangeReviewPreview,
  isDateRangeReviewShareId,
  readDateRangeReviewShareOrNull,
} from "./date-range-review";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");

  return {
    ...actual,
    apiAuthFetch: vi.fn(),
    apiFetch: vi.fn(),
  };
});

describe("date-range-review helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts UUID share ids and rejects malformed values", () => {
    expect(isDateRangeReviewShareId("93d27350-b7a4-48ba-a93f-16f38d44aa03")).toBe(true);
    expect(isDateRangeReviewShareId("not-a-share-id")).toBe(false);
    expect(isDateRangeReviewShareId("kesaloma-2026")).toBe(false);
  });

  it("returns null when the share snapshot is not published", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(404, "missing"));

    await expect(
      readDateRangeReviewShareOrNull("93d27350-b7a4-48ba-a93f-16f38d44aa03"),
    ).resolves.toBeNull();
  });

  it("rethrows unexpected share read failures", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("boom"));

    await expect(
      readDateRangeReviewShareOrNull("93d27350-b7a4-48ba-a93f-16f38d44aa03"),
    ).rejects.toThrow("boom");
  });

  it("normalizes missing visit arrays from preview responses", async () => {
    vi.mocked(apiAuthFetch).mockResolvedValueOnce({
      story: {
        cards: [
          {
            featuredImage: null,
            kind: "trip-summary",
            trip: {
              dateRange: null,
              id: 5,
              imageCount: 2,
              name: "Kesaretki",
              slug: "kesaretki",
              visitCount: 2,
            },
          },
          {
            kind: "other-visits",
          },
        ],
        summary: {
          distinctParkCount: 2,
          imageCount: 2,
          newNationalParkCount: 0,
          revisitedParkCount: 0,
          tripCount: 1,
          visitCount: 2,
        },
      },
    } as never);

    const preview = await fetchDateRangeReviewPreview({
      endDate: "2026-08-06",
      name: "Kesaretki",
      startDate: "2026-08-05",
    });

    const tripCard = preview.story.cards.find((card) => card.kind === "trip-summary");
    const otherVisitsCard = preview.story.cards.find((card) => card.kind === "other-visits");

    expect(tripCard?.trip.visits).toEqual([]);
    expect(otherVisitsCard?.visits).toEqual([]);
  });

  it("normalizes missing visit arrays from published share snapshots", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      overview: {
        endDate: "2026-08-06",
        name: "Kesaretki",
        shareSlug: "kesaretki",
        startDate: "2026-08-05",
      },
      publishedAt: "2026-08-07T08:00:00Z",
      story: {
        cards: [
          {
            featuredImage: null,
            kind: "trip-summary",
            trip: {
              dateRange: null,
              id: 5,
              imageCount: 2,
              name: "Kesaretki",
              slug: "kesaretki",
              visitCount: 2,
            },
          },
          {
            kind: "other-visits",
          },
        ],
        summary: {
          distinctParkCount: 2,
          imageCount: 2,
          newNationalParkCount: 0,
          revisitedParkCount: 0,
          tripCount: 1,
          visitCount: 2,
        },
      },
    } as never);

    const share = await readDateRangeReviewShareOrNull("93d27350-b7a4-48ba-a93f-16f38d44aa03");

    const tripCard = share?.story.cards.find((card) => card.kind === "trip-summary");
    const otherVisitsCard = share?.story.cards.find((card) => card.kind === "other-visits");

    expect(tripCard?.trip.visits).toEqual([]);
    expect(otherVisitsCard?.visits).toEqual([]);
  });

  it("builds a metadata description through the provided translation callback", () => {
    const description = buildDateRangeReviewShareDescription({
      imageCount: 12,
      name: "Kesaloma 2026",
      t: (key, values) =>
        `${key}:${values?.name}:${values?.visitCount}:${values?.tripCount}:${values?.imageCount}`,
      tripCount: 2,
      visitCount: 5,
    });

    expect(description).toBe("shareDescription:Kesaloma 2026:5:2:12");
  });
});
