import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/fi.json";
import { apiPublicFetch } from "@/lib/api";
import YearReviewOpenGraphImage, {
  alt as yearReviewAlt,
  contentType as yearReviewContentType,
  size as yearReviewSize,
} from "./(user)/vuosikatsaus/[year]/opengraph-image";
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

vi.mock("@/lib/api", () => ({
  apiPublicFetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

const timelineVisit = {
  id: 1,
  visitedOn: "2024-06-15",
  route: null,
  createdAt: "2024-06-15T10:00:00Z",
  imageCount: 2,
  park: { name: "Pallas-Yllästunturi", slug: "pallas", typeLabel: "Kansallispuisto" },
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
    vi.mocked(apiPublicFetch).mockResolvedValueOnce({ visits: [timelineVisit] });

    expect(yearReviewAlt).toBe("Reissuvihkon vuosikatsaus.");
    expect(yearReviewContentType).toBe("image/png");
    expect(yearReviewSize).toEqual({ width: 1200, height: 630 });
    await expect(
      YearReviewOpenGraphImage({ params: Promise.resolve({ year: "2024" }) }),
    ).resolves.toEqual({
      title: "Vuosikatsaus 2024",
      description: "Käynnit, uudet paikat ja kuvat vuodelta 2024 Reissuvihkossa.",
      highlights: ["1 käyntiä", "1 uutta paikkaa", "2 kuvaa"],
      variant: "landscape",
      width: 1200,
      height: 630,
    });
  });

  it("calls notFound for a year review image with an unknown year", async () => {
    vi.mocked(apiPublicFetch).mockResolvedValueOnce({ visits: [timelineVisit] });

    await expect(
      YearReviewOpenGraphImage({ params: Promise.resolve({ year: "2019" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });
});
