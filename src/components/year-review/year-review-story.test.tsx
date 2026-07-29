import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { YearReviewStory } from "./year-review-story";

vi.mock("@/components/ui/app-image", () => ({
  AppImage: ({ alt, src }: { alt: string; src: string }) => (
    <div aria-label={alt} data-src={src} role="img" />
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    if (key === "story.introTitle") {
      return `Retkivuosi ${values?.year ?? ""}`;
    }

    if (key === "story.progress") {
      return `Kortti ${values?.current}/${values?.total}`;
    }

    if (key === "story.strongestSeasonValue") {
      return `Vahvin vuodenaika: ${values?.season ?? ""}`;
    }

    if (key === "story.publishedOn") {
      return `Julkaistu ${values?.date ?? ""}`;
    }

    return key;
  },
}));

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
      kind: "intro" as const,
      primaryStat: {
        key: "visitCount" as const,
        value: 7,
      },
      year: 2024,
    },
    {
      kind: "milestone" as const,
      milestone: "first-visit" as const,
      visit: {
        id: 1,
        imageCount: 3,
        park: {
          name: "Pallas-Yllästunturi",
          slug: "pallas-yllastunturi",
        },
        route: "Huippupolku",
        trip: {
          id: 12,
          name: "Kevätretki",
          slug: "kevatretki",
        },
        visitedOn: "2024-04-06",
      },
    },
    {
      kind: "seasonal" as const,
      strongestSeason: "summer" as const,
      visitsBySeason: {
        autumn: 1,
        spring: 2,
        summer: 3,
        winter: 1,
      },
    },
    {
      kind: "summary" as const,
      highlights: ["7 visits"],
    },
  ],
};

const fallbackStory = {
  year: 2025,
  summary: {
    activeMonthCount: 2,
    distinctParkCount: 1,
    imageCount: 3,
    newParkCount: 0,
    revisitedParkCount: 1,
    visitCount: 2,
    visitsBySeason: {
      autumn: 0,
      spring: 0,
      summer: 2,
      winter: 0,
    },
  },
  cards: [
    {
      kind: "intro" as const,
      primaryStat: {
        key: "visitCount" as const,
        value: 2,
      },
      year: 2025,
    },
    {
      kind: "milestone" as const,
      milestone: "last-visit" as const,
      visit: {
        id: 7,
        imageCount: 0,
        park: {
          name: "Repovesi",
          slug: "repovesi",
        },
        route: null,
        trip: null,
        visitedOn: "2025-08-21",
      },
    },
    {
      kind: "photo-highlight" as const,
      featuredImage: {
        alt: "Kuva Repovedeltä",
        fullHeight: 1200,
        fullUrl: "https://images.example/repovesi-full.jpg",
        fullWidth: 1600,
        thumbHeight: 900,
        thumbUrl: "https://images.example/repovesi-thumb.jpg",
        thumbWidth: 1200,
      },
      totalImageCount: 3,
      visit: {
        id: 7,
        imageCount: 3,
        park: {
          name: "Repovesi",
          slug: "repovesi",
        },
        route: null,
        trip: null,
        visitedOn: "2025-08-21",
      },
    },
    {
      kind: "profile" as const,
      busiestMonth: null,
      busiestWeekday: null,
      mostVisitedPark: null,
      topRoute: null,
      topTypeLabel: null,
    },
    {
      kind: "trip-highlight" as const,
      trip: {
        dateRange: null,
        id: 99,
        imageCount: 3,
        name: "Loppukesän kierros",
        slug: "loppukesan-kierros",
        visitCount: 2,
      },
    },
    {
      kind: "seasonal" as const,
      strongestSeason: null,
      visitsBySeason: {
        autumn: 0,
        spring: 0,
        summer: 2,
        winter: 0,
      },
    },
    {
      kind: "summary" as const,
      highlights: ["2 visits"],
    },
  ],
};

const repeatSpotlightStory = {
  ...fallbackStory,
  cards: fallbackStory.cards.map((card) =>
    card.kind === "profile"
      ? {
          ...card,
          mostVisitedPark: {
            name: "Sipoonkorven kansallispuisto",
            slug: "sipoonkorpi",
            visitCount: 3,
          },
          topTypeLabel: "Kansallispuisto",
        }
      : card,
  ),
};

const explorationStory = {
  ...fallbackStory,
  cards: fallbackStory.cards.map((card) =>
    card.kind === "profile"
      ? {
          ...card,
          mostVisitedPark: {
            name: "Sipoonkorven kansallispuisto",
            slug: "sipoonkorpi",
            visitCount: 2,
          },
          topTypeLabel: "Kansallispuisto",
        }
      : card,
  ),
};

const visitOnlyPhotoStory = {
  ...fallbackStory,
  cards: fallbackStory.cards.map((card) =>
    card.kind === "photo-highlight"
      ? {
          ...card,
          featuredImage: null,
        }
      : card,
  ),
};

const imageOnlyPhotoStory = {
  ...fallbackStory,
  cards: fallbackStory.cards.map((card) =>
    card.kind === "photo-highlight"
      ? {
          ...card,
          featuredImage: {
            alt: null,
            fullHeight: 1200,
            fullUrl: "https://images.example/highlight-full.jpg",
            fullWidth: 1600,
            thumbHeight: 900,
            thumbUrl: "https://images.example/highlight-thumb.jpg",
            thumbWidth: 1200,
          },
          visit: null,
        }
      : card,
  ),
};

describe("YearReviewStory", () => {
  it("renders the story cards with milestone and seasonal details", () => {
    render(
      <YearReviewStory
        story={story}
        mode="public"
        headingLevel={1}
        publishedAt="2024-12-31T11:00:00Z"
      />,
    );

    expect(screen.getByTestId("year-review-story")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Retkivuosi 2024" })).toBeInTheDocument();
    expect(screen.getByText("Pallas-Yllästunturi")).toBeInTheDocument();
    expect(screen.getByText("Huippupolku")).toBeInTheDocument();
    expect(screen.getByText("story.seasonalTitle")).toBeInTheDocument();
    expect(screen.getByText("Vahvin vuodenaika: seasons.summer")).toBeInTheDocument();
    expect(screen.getByText("2 · 29 %")).toBeInTheDocument();
    expect(screen.getByText("3 · 43 %")).toBeInTheDocument();
    expect(screen.getByText("seasons.spring").parentElement).toHaveTextContent("🌱");
    expect(screen.getByText("seasons.summer").parentElement).toHaveTextContent("☀️");
    expect(screen.getByText(/Julkaistu/)).toBeInTheDocument();
  });

  it("falls back to an empty story card when there are no visits", () => {
    render(
      <YearReviewStory
        story={{
          year: 2026,
          summary: {
            activeMonthCount: 0,
            distinctParkCount: 0,
            imageCount: 0,
            newParkCount: 0,
            revisitedParkCount: 0,
            visitCount: 0,
            visitsBySeason: {
              autumn: 0,
              spring: 0,
              summer: 0,
              winter: 0,
            },
          },
          cards: [
            {
              kind: "intro",
              primaryStat: {
                key: "visitCount",
                value: 0,
              },
              year: 2026,
            },
          ],
        }}
        mode="preview"
      />,
    );

    expect(screen.getByRole("heading", { name: "2026" })).toBeInTheDocument();
    expect(screen.getByText("story.emptyTitle")).toBeInTheDocument();
  });

  it("renders fallback text for cards with missing optional details", () => {
    render(<YearReviewStory story={fallbackStory} mode="preview" />);

    expect(screen.getAllByText("Repovesi").length).toBeGreaterThan(0);
    expect(screen.getByRole("img", { name: "Kuva Repovedeltä" })).toBeInTheDocument();
    expect(screen.getAllByText("story.notAvailable").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Loppukesän kierros").length).toBe(2);
    expect(screen.getByText("story.tripHighlightCaption")).toBeInTheDocument();
  });

  it("falls back to the visit details tile when the photo highlight has no featured image", () => {
    render(<YearReviewStory story={visitOnlyPhotoStory} mode="preview" />);

    expect(screen.getAllByText("story.photoVisitTitle").length).toBeGreaterThan(0);
    expect(screen.queryByRole("img", { name: "Kuva Repovedeltä" })).not.toBeInTheDocument();
  });

  it("falls back to the photo title as image alt text when the hero image has no own alt", () => {
    render(<YearReviewStory story={imageOnlyPhotoStory} mode="preview" />);

    expect(screen.getByRole("img", { name: "story.photoTitle" })).toBeInTheDocument();
    expect(screen.getAllByText("story.notAvailable").length).toBeGreaterThan(0);
  });

  it("highlights a returned place only when repeat visits are genuinely meaningful", () => {
    render(<YearReviewStory story={repeatSpotlightStory} mode="preview" />);

    expect(screen.getByText("story.returnedPlace")).toBeInTheDocument();
    expect(screen.getByText("Sipoonkorven kansallispuisto")).toBeInTheDocument();
    expect(screen.getByText("3 story.visitCountLabel")).toBeInTheDocument();
  });

  it("falls back to the place type when repeats stay below the spotlight threshold", () => {
    render(<YearReviewStory story={explorationStory} mode="preview" />);

    expect(screen.getByText("story.topType")).toBeInTheDocument();
    expect(screen.getByText("Kansallispuisto")).toBeInTheDocument();
    expect(screen.queryByText("story.returnedPlace")).not.toBeInTheDocument();
  });

  it("registers an intersection observer when the browser supports it", () => {
    const observe = vi.fn();
    const disconnect = vi.fn();

    class MockIntersectionObserver {
      observe = observe;
      disconnect = disconnect;
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    const { unmount } = render(<YearReviewStory story={story} mode="public" />);

    expect(observe).toHaveBeenCalled();

    unmount();

    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
