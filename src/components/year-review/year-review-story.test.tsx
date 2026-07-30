import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { YearReviewStory } from "./year-review-story";

vi.mock("@/components/ui/app-image", () => ({
  AppImage: ({ alt, className, src }: { alt: string; className?: string; src: string }) => (
    <div aria-label={alt} data-class-name={className} data-src={src} role="img" />
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
      featuredImage: null,
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
      featuredImage: null,
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
      featuredImage: null,
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
      kind: "new-parks" as const,
      parks: [
        {
          featuredImage: null,
          park: {
            name: "Lauhanvuori",
            slug: "lauhanvuori",
          },
          visitedOn: "2025-06-12",
        },
      ],
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

const portraitMilestoneStory = {
  ...fallbackStory,
  cards: fallbackStory.cards.map((card) =>
    card.kind === "milestone"
      ? {
          ...card,
          featuredImage: {
            alt: "Pystysuuntainen kuva",
            fullHeight: 1600,
            fullUrl: "https://images.example/portrait-full.jpg",
            fullWidth: 900,
            thumbHeight: 400,
            thumbUrl: "https://images.example/portrait-thumb.jpg",
            thumbWidth: 300,
          },
        }
      : card,
  ),
};

const portraitTripStory = {
  ...fallbackStory,
  cards: fallbackStory.cards.map((card) =>
    card.kind === "trip-highlight"
      ? {
          ...card,
          featuredImage: {
            alt: "Pystysuuntainen retkikuva",
            fullHeight: 1600,
            fullUrl: "https://images.example/trip-portrait-full.jpg",
            fullWidth: 900,
            thumbHeight: 400,
            thumbUrl: "https://images.example/trip-portrait-thumb.jpg",
            thumbWidth: 300,
          },
        }
      : card,
  ),
};

let latestIntersectionCallback: IntersectionObserverCallback | null = null;

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    latestIntersectionCallback = callback;
  }
}

const triggerIntersection = (target: Element, intersectionRatio = 0.85) => {
  if (latestIntersectionCallback === null) {
    throw new Error("Expected an intersection observer callback to be registered.");
  }

  act(() => {
    latestIntersectionCallback?.(
      [
        {
          intersectionRatio,
          isIntersecting: true,
          target,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
  });
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
    expect(screen.getByText("story.footer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "story.browseApp" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "siteTitle" })).toHaveAttribute("href", "/");
    expect(screen.queryByText("story.shareBadge")).not.toBeInTheDocument();
    expect(screen.queryByText("story.footerHint")).not.toBeInTheDocument();
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
    expect(screen.getByRole("img", { name: "Kuva Repovedeltä" })).toHaveAttribute(
      "data-src",
      "https://images.example/repovesi-full.jpg",
    );
    expect(screen.getAllByText("story.notAvailable").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Loppukesän kierros").length).toBe(2);
    expect(screen.getByText("story.tripHighlightCaption")).toBeInTheDocument();
    expect(screen.getByText("story.newParksTitle")).toBeInTheDocument();
    expect(screen.getByText("Lauhanvuori")).toBeInTheDocument();
  });

  it("uses a portrait-friendly image treatment for tall featured photos", () => {
    render(<YearReviewStory story={portraitMilestoneStory} mode="preview" />);

    expect(
      screen.getByRole("img", { name: "Pystysuuntainen kuva" }).closest("[data-story-layout]"),
    ).toHaveAttribute("data-story-layout", "portrait-split");
    expect(screen.getByRole("img", { name: "Pystysuuntainen kuva" })).toHaveAttribute(
      "data-class-name",
      expect.stringContaining("object-contain"),
    );
    expect(screen.getByRole("img", { name: "Pystysuuntainen kuva" })).toHaveAttribute(
      "data-src",
      "https://images.example/portrait-full.jpg",
    );
  });

  it("places portrait trip highlight imagery to the right of the details column", () => {
    render(<YearReviewStory story={portraitTripStory} mode="preview" />);

    expect(
      screen.getByRole("img", { name: "Pystysuuntainen retkikuva" }).closest("[data-story-layout]"),
    ).toHaveAttribute("data-story-layout", "portrait-media-right");
    expect(screen.getByRole("img", { name: "Pystysuuntainen retkikuva" })).toHaveAttribute(
      "data-src",
      "https://images.example/trip-portrait-full.jpg",
    );
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

  it("lets people move between cards with the previous and next buttons", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();

    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollTo,
      writable: true,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 3200,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
      writable: true,
    });
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<YearReviewStory story={fallbackStory} mode="public" />);

    const storyElement = screen.getByTestId("year-review-story");
    const navigationPanel = screen.getByLabelText("story.progressNavigator").closest("div");
    const secondCard = screen.getByTestId("year-review-story-card-1");
    const seasonalCard = screen.getByTestId("year-review-story-card-6");
    const summaryCard = screen.getByTestId("year-review-story-card-7");

    if (!(navigationPanel && secondCard && seasonalCard && summaryCard)) {
      throw new Error("Expected the navigation panel and story cards to exist.");
    }

    vi.spyOn(storyElement, "getBoundingClientRect").mockReturnValue({
      bottom: 960,
      height: 960,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 48,
      width: 0,
      x: 0,
      y: 48,
    });
    vi.spyOn(navigationPanel, "getBoundingClientRect").mockReturnValue({
      bottom: 108,
      height: 96,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 12,
      width: 0,
      x: 0,
      y: 12,
    });
    vi.spyOn(summaryCard, "getBoundingClientRect").mockReturnValue({
      bottom: 2560,
      height: 560,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 2180,
      width: 0,
      x: 0,
      y: 2180,
    });

    triggerIntersection(secondCard);

    await user.click(screen.getByRole("button", { name: "story.previous" }));

    expect(scrollTo).toHaveBeenCalledWith({
      behavior: "auto",
      top: 48,
    });

    vi.clearAllMocks();

    triggerIntersection(seasonalCard);

    await user.click(screen.getByRole("button", { name: "story.next" }));

    expect(scrollTo).toHaveBeenCalledWith({
      behavior: "auto",
      top: 2052,
    });
    vi.unstubAllGlobals();
  });

  it("updates the previous and next button disabled states with the active card", () => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<YearReviewStory story={fallbackStory} mode="public" />);

    const previousButton = screen.getByRole("button", { name: "story.previous" });
    const nextButton = screen.getByRole("button", { name: "story.next" });
    const summaryCard = screen.getByTestId("year-review-story-card-7");

    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeEnabled();

    triggerIntersection(summaryCard);

    expect(previousButton).toBeEnabled();
    expect(nextButton).toBeDisabled();
    vi.unstubAllGlobals();
  });

  it("lets people jump straight to a story card from the progress bars", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();
    const matchMedia = vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    });

    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollTo,
      writable: true,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 3200,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 900,
      writable: true,
    });
    vi.stubGlobal("matchMedia", matchMedia);

    render(<YearReviewStory story={fallbackStory} mode="public" />);

    const cardJumpButtons = screen.getAllByRole("button", { name: "story.goToCard" });
    const firstCardButton = cardJumpButtons[0];

    if (!firstCardButton) {
      throw new Error("Expected the first card jump button to exist.");
    }

    await user.click(firstCardButton);

    expect(scrollTo).toHaveBeenCalledWith({
      behavior: "auto",
      top: 0,
    });
    vi.clearAllMocks();

    const navigationPanel = screen.getByLabelText("story.progressNavigator").closest("div");
    const targetSection = screen.getByTestId("year-review-story-card-2");

    if (!(navigationPanel && targetSection)) {
      throw new Error("Expected the navigation panel and target section to exist.");
    }

    vi.spyOn(navigationPanel, "getBoundingClientRect").mockReturnValue({
      bottom: 108,
      height: 96,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 12,
      width: 0,
      x: 0,
      y: 12,
    });
    vi.spyOn(targetSection, "getBoundingClientRect").mockReturnValue({
      bottom: 1840,
      height: 520,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 1320,
      width: 0,
      x: 0,
      y: 1320,
    });

    const targetButton = cardJumpButtons[2];

    expect(targetButton).toBeDefined();

    if (!targetButton) {
      throw new Error("Expected a third card jump button to exist.");
    }

    await user.click(targetButton);

    expect(scrollTo).toHaveBeenCalledWith({
      behavior: "auto",
      top: 1192,
    });
    vi.unstubAllGlobals();
  });
});
