import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";
import messages from "../../messages/fi.json";
import YearReviewOpenGraphImage, {
  alt as yearReviewAlt,
  contentType as yearReviewContentType,
  size as yearReviewSize,
} from "./(user)/vuosikatsaus/jako/[shareId]/opengraph-image";
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

const { createSocialPreviewImageResponseMock, mockNotFound } = vi.hoisted(() => ({
  createSocialPreviewImageResponseMock: vi.fn((options) => options),
  mockNotFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
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

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

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
    ],
  },
  year: 2024,
};

describe("social image routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  it("serves the square Open Graph image metadata route", () => {
    expect(openGraphAlt).toBe(
      "Reissuvihko: tutki Suomen retkipaikkoja ja seuraa tekijöiden ulkoiluseikkailuja.",
    );
    expect(openGraphContentType).toBe("image/png");
    expect(openGraphSize).toEqual({ width: 1200, height: 1200 });
    expect(OpenGraphImage()).toEqual({
      title: messages.metadata.title,
      description: messages.metadata.description,
      variant: "square",
      width: 1200,
      height: 1200,
    });
  });

  it("serves the landscape Twitter image metadata route", () => {
    expect(twitterAlt).toBe(
      "Reissuvihko: tutki Suomen retkipaikkoja ja seuraa tekijöiden ulkoiluseikkailuja.",
    );
    expect(twitterContentType).toBe("image/png");
    expect(twitterSize).toEqual({ width: 1200, height: 630 });
    expect(TwitterImage()).toEqual({
      title: messages.metadata.title,
      description: messages.metadata.description,
      variant: "landscape",
      width: 1200,
      height: 630,
    });
  });

  it("serves the landscape year review Open Graph image with headline stats", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(yearReviewShare);

    expect(yearReviewAlt).toBe("Reissuvihkon vuosikatsaus.");
    expect(yearReviewContentType).toBe("image/png");
    expect(yearReviewSize).toEqual({ width: 1200, height: 630 });
    await expect(
      YearReviewOpenGraphImage({ params: Promise.resolve({ shareId }) }),
    ).resolves.toEqual({
      title: "Vuosikatsaus 2024",
      description: "Käynnit, uudet paikat ja kuvat vuodelta 2024 Reissuvihkossa.",
      highlights: ["1 käyntiä", "1 uutta paikkaa", "2 kuvaa", "Pallas-Yllästunturi x1"],
      imageUrl: "https://images.example/pallas-full.jpg",
      variant: "landscape",
      width: 1200,
      height: 630,
    });
  });

  it("calls notFound for a year review image with an unknown share", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(404, "missing"));

    await expect(
      YearReviewOpenGraphImage({ params: Promise.resolve({ shareId }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("calls notFound for a malformed year review share id", async () => {
    await expect(
      YearReviewOpenGraphImage({ params: Promise.resolve({ shareId: "not-a-share-id" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });
});
