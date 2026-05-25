import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("social image routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves the square Open Graph image metadata route", () => {
    expect(openGraphAlt).toBe(
      "Reissuvihko: tutki Suomen retkipaikkoja ja seuraa tekijöiden ulkoiluseikkailuja.",
    );
    expect(openGraphContentType).toBe("image/png");
    expect(openGraphSize).toEqual({ width: 1200, height: 1200 });
    expect(OpenGraphImage()).toEqual({
      title: "Reissuvihko",
      description:
        "Reissuvihko kokoaa tekijöidensä käynnit Suomen retkeilypaikoissa, tarinat kuvineen muistoina retkistä sekä etenemisen samoihin kuoriin.",
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
      title: "Reissuvihko",
      description:
        "Reissuvihko kokoaa tekijöidensä käynnit Suomen retkeilypaikoissa, tarinat kuvineen muistoina retkistä sekä etenemisen samoihin kuoriin.",
      variant: "landscape",
      width: 1200,
      height: 630,
    });
  });
});
