import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./api";
import {
  buildYearReviewShareDescription,
  findYearReviewProfileCard,
  findYearReviewSeasonalCard,
  isYearReviewShareId,
  readYearReviewShareOrNull,
  type YearReviewStory,
} from "./year-review";

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");

  return {
    ...actual,
    apiAuthFetch: vi.fn(),
    apiFetch: vi.fn(),
  };
});

const story = {
  year: 2024,
  summary: {
    activeMonthCount: 5,
    distinctParkCount: 4,
    imageCount: 18,
    newParkCount: 2,
    revisitedParkCount: 2,
    visitCount: 7,
    visitsBySeason: {
      autumn: 1,
      spring: 2,
      summer: 3,
      winter: 1,
    },
  },
  cards: [
    {
      kind: "profile",
      busiestMonth: 7,
      busiestWeekday: 6,
      mostVisitedPark: {
        name: "Nuuksio",
        slug: "nuuksio",
        visitCount: 3,
      },
      topRoute: "Haukkalampi",
      topTypeLabel: "Kansallispuisto",
    },
    {
      kind: "summary",
      highlights: ["7 visits"],
    },
  ],
} satisfies YearReviewStory;

describe("year-review helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts UUID share ids and rejects malformed values", () => {
    expect(isYearReviewShareId("93d27350-b7a4-48ba-a93f-16f38d44aa03")).toBe(true);
    expect(isYearReviewShareId("not-a-share-id")).toBe(false);
    expect(isYearReviewShareId("2024")).toBe(false);
  });

  it("returns the profile card when the generated story contains one", () => {
    expect(findYearReviewProfileCard(story)?.mostVisitedPark?.name).toBe("Nuuksio");
  });

  it("returns null when the generated story has no profile card", () => {
    expect(findYearReviewProfileCard({ ...story, cards: [] })).toBeNull();
  });

  it("returns the seasonal card when the generated story contains one", () => {
    expect(
      findYearReviewSeasonalCard({
        ...story,
        cards: [
          {
            kind: "seasonal",
            strongestSeason: "summer",
            visitsBySeason: {
              autumn: 1,
              spring: 2,
              summer: 3,
              winter: 1,
            },
          },
        ],
      })?.strongestSeason,
    ).toBe("summer");
    expect(findYearReviewSeasonalCard(story)).toBeNull();
  });

  it("returns null when the share snapshot is not published", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(404, "missing"));

    await expect(
      readYearReviewShareOrNull("93d27350-b7a4-48ba-a93f-16f38d44aa03"),
    ).resolves.toBeNull();
  });

  it("rethrows unexpected share read failures", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("boom"));

    await expect(readYearReviewShareOrNull("93d27350-b7a4-48ba-a93f-16f38d44aa03")).rejects.toThrow(
      "boom",
    );
  });

  it("builds a metadata description through the provided translation callback", () => {
    const description = buildYearReviewShareDescription({
      imageCount: story.summary.imageCount,
      newParkCount: story.summary.newParkCount,
      t: (key, values) =>
        `${key}:${values?.year}:${values?.visitCount}:${values?.newParkCount}:${values?.imageCount}`,
      visitCount: story.summary.visitCount,
      year: story.year,
    });

    expect(description).toBe("shareDescription:2024:7:2:18");
  });
});
