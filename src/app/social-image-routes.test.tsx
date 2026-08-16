import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";
import { GET as getDateRangeReviewShareImage } from "./(user)/ajanjaksokatsaus/jako/[shareId]/kuva/route";
import { GET as getYearReviewShareImage } from "./(user)/vuosikatsaus/jako/[shareId]/kuva/route";
import OpenGraphImage, {
  alt as openGraphAlt,
  contentType as openGraphContentType,
  size as openGraphSize,
} from "./opengraph-image";
import TwitterImage, {
  alt as twitterAlt,
  contentType as twitterContentType,
  size as twitterSize,
} from "./twitter-image";

const { createSocialPreviewImageResponseMock } = vi.hoisted(() => ({
  createSocialPreviewImageResponseMock: vi.fn((options) => options),
}));

vi.mock("@/lib/social-preview-image", () => ({
  createSocialPreviewImageResponse: createSocialPreviewImageResponseMock,
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");

  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

const shareId = "93d27350-b7a4-48ba-a93f-16f38d44aa03";

const yearReviewShare = {
  publishedAt: "2024-12-31T11:00:00Z",
  shareId,
  story: {
    year: 2024,
    summary: {
      activeMonthCount: 1,
      distinctParkCount: 1,
      imageCount: 2,
      newParkCount: 1,
      revisitedParkCount: 0,
      visitCount: 1,
      visitsBySeason: {
        autumn: 0,
        spring: 1,
        summer: 0,
        winter: 0,
      },
    },
    cards: [
      {
        featuredImage: {
          alt: "Kuva Pallas-Yllästunturilta",
          fullHeight: 1200,
          fullUrl: "https://images.example/pallas-full.jpg",
          fullWidth: 1600,
          thumbHeight: 900,
          thumbUrl: "https://images.example/pallas-thumb.jpg",
          thumbWidth: 1200,
        },
        kind: "photo-highlight",
        totalImageCount: 2,
        visit: {
          id: 1,
          imageCount: 2,
          park: {
            name: "Pallas-Yllästunturi",
            slug: "pallas",
          },
          route: "Huippupolku",
          trip: null,
          visitedOn: "2024-06-15",
        },
      },
      {
        kind: "profile",
        busiestMonth: 6,
        busiestWeekday: 6,
        mostVisitedPark: {
          name: "Pallas-Yllästunturi",
          slug: "pallas",
          visitCount: 1,
        },
        topRoute: "Huippupolku",
        topTypeLabel: "Kansallispuisto",
      },
      {
        featuredImage: {
          alt: "Kesäretken näkymä",
          fullHeight: 1200,
          fullUrl: "https://images.example/trip-full.jpg",
          fullWidth: 1600,
          thumbHeight: 900,
          thumbUrl: "https://images.example/trip-thumb.jpg",
          thumbWidth: 1200,
        },
        kind: "trip-highlight",
        trip: {
          dateRange: {
            end: "2024-06-16",
            start: "2024-06-15",
          },
          id: 55,
          imageCount: 2,
          name: "Kesäretki",
          slug: "kesaretki",
          visitCount: 1,
        },
      },
    ],
  },
  year: 2024,
};

const dateRangeReviewShare = {
  overview: {
    endDate: "2026-08-06",
    name: "Kesaloma 2026",
    shareSlug: "kesaloma-2026",
    startDate: "2026-07-31",
  },
  publishedAt: "2026-08-07T09:00:00Z",
  shareId,
  story: {
    summary: {
      distinctParkCount: 4,
      imageCount: 8,
      newNationalParkCount: 2,
      revisitedParkCount: 1,
      tripCount: 3,
      visitCount: 6,
    },
    cards: [
      {
        dateRange: {
          endDate: "2026-08-06",
          startDate: "2026-07-31",
        },
        kind: "intro",
        name: "Kesaloma 2026",
        primaryStat: {
          key: "visitCount",
          value: 6,
        },
        tripCount: 3,
      },
      {
        featuredImage: {
          alt: "Kesaloman suosikkikuva",
          fullHeight: 1200,
          fullUrl: "https://images.example/date-range-photo-full.jpg",
          fullWidth: 1600,
          thumbHeight: 900,
          thumbUrl: "https://images.example/date-range-photo-thumb.jpg",
          thumbWidth: 1200,
        },
        kind: "photo-highlight",
        totalImageCount: 8,
        visit: null,
      },
    ],
  },
};

describe("social image routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves the square Open Graph image metadata route", () => {
    expect(openGraphAlt).toEqual(expect.any(String));
    expect(openGraphAlt.length).toBeGreaterThan(0);
    expect(openGraphContentType).toBe("image/png");
    expect(openGraphSize).toEqual({ width: 1200, height: 1200 });
    expect(OpenGraphImage()).toMatchObject({
      title: expect.any(String),
      description: expect.any(String),
      variant: "square",
      width: 1200,
      height: 1200,
    });
  });

  it("serves the landscape Twitter image metadata route", () => {
    expect(twitterAlt).toEqual(expect.any(String));
    expect(twitterAlt.length).toBeGreaterThan(0);
    expect(twitterContentType).toBe("image/png");
    expect(twitterSize).toEqual({ width: 1200, height: 630 });
    expect(TwitterImage()).toMatchObject({
      title: expect.any(String),
      description: expect.any(String),
      variant: "landscape",
      width: 1200,
      height: 630,
    });
  });

  it("redirects year review share image requests to the featured photo", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(yearReviewShare);

    await expect(
      getYearReviewShareImage(new Request("https://frontend.example"), {
        params: Promise.resolve({ shareId }),
      }),
    ).resolves.toSatisfy(
      (result) =>
        result instanceof Response &&
        result.status === 307 &&
        result.headers.get("location") === "https://images.example/pallas-full.jpg",
    );
  });

  it("redirects year review share image requests to the trip photo when the photo highlight has no image", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ...yearReviewShare,
      story: {
        ...yearReviewShare.story,
        cards: yearReviewShare.story.cards.map((card) =>
          card.kind === "photo-highlight"
            ? {
                ...card,
                featuredImage: null,
              }
            : card,
        ),
      },
    });

    await expect(
      getYearReviewShareImage(new Request("https://frontend.example"), {
        params: Promise.resolve({ shareId }),
      }),
    ).resolves.toSatisfy(
      (result) =>
        result instanceof Response &&
        result.status === 307 &&
        result.headers.get("location") === "https://images.example/trip-full.jpg",
    );
  });

  it("falls back to a generated year review image when no featured photo exists", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ...yearReviewShare,
      story: {
        ...yearReviewShare.story,
        cards: yearReviewShare.story.cards
          .filter((card) => card.kind !== "photo-highlight")
          .map((card) =>
            card.kind === "trip-highlight"
              ? {
                  ...card,
                  featuredImage: null,
                }
              : card,
          ),
      },
    });

    await expect(
      getYearReviewShareImage(new Request("https://frontend.example"), {
        params: Promise.resolve({ shareId }),
      }),
    ).resolves.toSatisfy(
      (result) =>
        result.variant === "landscape" &&
        result.width === 1200 &&
        result.height === 630 &&
        result.imageUrl === null,
    );
  });

  it("returns 404 for a year review image with an unknown share", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(404, "missing"));

    await expect(
      getYearReviewShareImage(new Request("https://frontend.example"), {
        params: Promise.resolve({ shareId }),
      }),
    ).resolves.toHaveProperty("status", 404);
  });

  it("returns 404 for a malformed year review share id", async () => {
    await expect(
      getYearReviewShareImage(new Request("https://frontend.example"), {
        params: Promise.resolve({ shareId: "not-a-share-id" }),
      }),
    ).resolves.toHaveProperty("status", 404);
  });

  it("serves the landscape date-range review share image with headline stats", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(dateRangeReviewShare);

    await expect(
      getDateRangeReviewShareImage(new Request("https://frontend.example"), {
        params: Promise.resolve({ shareId }),
      }),
    ).resolves.toSatisfy(
      (result) =>
        result instanceof Response &&
        result.status === 307 &&
        result.headers.get("location") === "https://images.example/date-range-photo-full.jpg",
    );
  });

  it("falls back to a generated date-range review image when no featured photo exists", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ...dateRangeReviewShare,
      story: {
        ...dateRangeReviewShare.story,
        cards: dateRangeReviewShare.story.cards.map((card) =>
          card.kind === "photo-highlight"
            ? {
                ...card,
                featuredImage: null,
              }
            : card,
        ),
      },
    });

    await expect(
      getDateRangeReviewShareImage(new Request("https://frontend.example"), {
        params: Promise.resolve({ shareId }),
      }),
    ).resolves.toSatisfy(
      (result) =>
        result.variant === "landscape" &&
        result.width === 1200 &&
        result.height === 630 &&
        result.imageUrl === null,
    );
  });

  it("returns 404 for a malformed date-range review share id", async () => {
    await expect(
      getDateRangeReviewShareImage(new Request("https://frontend.example"), {
        params: Promise.resolve({ shareId: "not-a-share-id" }),
      }),
    ).resolves.toHaveProperty("status", 404);
  });
});
