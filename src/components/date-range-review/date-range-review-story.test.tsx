import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DateRangeReviewStory } from "./date-range-review-story";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <div aria-label={alt} data-src={src} role="img" />
  ),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    if (key === "story.progress") {
      return `${values?.name ?? ""} ${values?.current}/${values?.total}`;
    }

    if (key === "story.revisitedParkPreviousVisit") {
      return `Edellinen käynti ${values?.date ?? ""}`;
    }

    if (key === "story.revisitedParkTotalVisits") {
      return `Käyntejä yhteensä ${values?.count ?? ""}`;
    }

    if (key === "story.visitCountLabel" || key === "story.tripCountLabel") {
      return `${key}:${values?.count ?? ""}`;
    }

    return key;
  },
}));

const overview = {
  endDate: "2026-08-06",
  name: "Kesaloma 2026",
  shareSlug: "kesaloma-2026",
  startDate: "2026-07-31",
};

const story = {
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
      kind: "intro" as const,
      name: "Kesaloma 2026",
      primaryStat: {
        key: "visitCount" as const,
        value: 6,
      },
      tripCount: 3,
    },
    {
      featuredImage: null,
      kind: "photo-highlight" as const,
      totalImageCount: 8,
      visit: null,
    },
    {
      kind: "new-parks" as const,
      parks: [],
    },
    {
      kind: "revisited-parks" as const,
      parks: [
        {
          featuredImage: null,
          park: {
            name: "Repovesi",
            slug: "repovesi",
          },
          previousVisitDate: "2024-08-24",
          revisitCount: 1,
          visitedOn: "2026-08-04",
        },
      ],
    },
    {
      featuredImage: null,
      kind: "trip-summary" as const,
      trip: {
        dateRange: {
          end: "2026-08-01",
          start: "2026-08-01",
        },
        id: 1,
        imageCount: 2,
        name: "Saaristoretki",
        slug: "saaristoretki",
        visits: [
          {
            park: {
              name: "Örön linnakesaari",
              slug: "oro",
              typeLabel: "Historiakohde",
              typeSlug: "historiakohde",
            },
            visitedOn: "2026-08-01",
          },
          {
            park: {
              name: "Teijon kansallispuisto",
              slug: "teijo",
              typeLabel: "Kansallispuisto",
              typeSlug: "kansallispuisto",
            },
            visitedOn: "2026-08-01",
          },
        ],
        visitCount: 2,
      },
    },
    {
      featuredImage: null,
      kind: "trip-summary" as const,
      trip: {
        dateRange: {
          end: "2026-08-03",
          start: "2026-08-02",
        },
        id: 2,
        imageCount: 3,
        name: "Kymenlaakson kierros",
        slug: "kymenlaakson-kierros",
        visits: [
          {
            park: {
              name: "Repoveden kansallispuisto",
              slug: "repovesi",
              typeLabel: "Kansallispuisto",
              typeSlug: "kansallispuisto",
            },
            visitedOn: "2026-08-02",
          },
          {
            park: {
              name: "Langinkoski",
              slug: "langinkoski",
              typeLabel: "Historiakohde",
              typeSlug: "historiakohde",
            },
            visitedOn: "2026-08-03",
          },
        ],
        visitCount: 2,
      },
    },
    {
      featuredImage: null,
      kind: "trip-summary" as const,
      trip: {
        dateRange: {
          end: "2026-08-06",
          start: "2026-08-05",
        },
        id: 3,
        imageCount: 3,
        name: "Hankoretki",
        slug: "hankoretki",
        visits: [
          {
            park: {
              name: "Tulliniemen luontopolku",
              slug: "tulliniemi",
              typeLabel: "Luontokohde",
              typeSlug: "luontokohde",
            },
            visitedOn: "2026-08-05",
          },
          {
            park: {
              name: "Bengtskär",
              slug: "bengtskar",
              typeLabel: "Majakka",
              typeSlug: "majakka",
            },
            visitedOn: "2026-08-06",
          },
        ],
        visitCount: 2,
      },
    },
    {
      kind: "other-visits" as const,
      visits: [
        {
          park: {
            name: "Aulanko",
            slug: "aulanko",
            typeLabel: "Luontokohde",
            typeSlug: "luontokohde",
          },
          visitedOn: "2026-08-06",
        },
        {
          park: {
            name: "Porvoon vanhakaupunki",
            slug: "porvoon-vanhakaupunki",
            typeLabel: "Historiakohde",
            typeSlug: "historiakohde",
          },
          visitedOn: "2026-08-04",
        },
      ],
    },
  ],
};

const intersectionCallbacks: IntersectionObserverCallback[] = [];

beforeEach(() => {
  intersectionCallbacks.length = 0;
});

class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    intersectionCallbacks.push(callback);
  }
}

const triggerIntersections = (
  entries: Array<{
    intersectionRatio: number;
    isIntersecting?: boolean;
    target: Element;
    top?: number;
  }>,
) => {
  if (intersectionCallbacks.length === 0) {
    throw new Error("Expected intersection observer callbacks to be registered.");
  }

  act(() => {
    for (const callback of intersectionCallbacks) {
      callback(
        entries.map((entry) => ({
          boundingClientRect: {
            bottom: (entry.top ?? 0) + 100,
            height: 100,
            left: 0,
            right: 0,
            toJSON: () => ({}),
            top: entry.top ?? 0,
            width: 0,
            x: 0,
            y: entry.top ?? 0,
          },
          intersectionRatio: entry.intersectionRatio,
          isIntersecting: entry.isIntersecting ?? true,
          target: entry.target,
        })) as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      );
    }
  });
};

const setScrollState = ({
  innerHeight = 900,
  scrollHeight = 3200,
  scrollY = 0,
}: {
  innerHeight?: number;
  scrollHeight?: number;
  scrollY?: number;
}) => {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: innerHeight,
    writable: true,
  });
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: scrollY,
    writable: true,
  });
};

describe("DateRangeReviewStory", () => {
  it("renders the sticky navigation title, shared Finnish date ranges, and corrected revisited totals", () => {
    render(
      <DateRangeReviewStory
        mode="public"
        overview={overview}
        publishedAt="2026-08-07T09:00:00Z"
        story={story}
      />,
    );

    const revisitedCard = screen.getByTestId("date-range-review-story-card-3");
    const firstTripCard = screen.getByTestId("date-range-review-story-card-4");
    const otherVisitsCard = screen.getByTestId("date-range-review-story-card-7");

    expect(screen.getByText("Kesaloma 2026 1/8")).toBeInTheDocument();
    expect(screen.getAllByText("Kesaloma 2026")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "story.previous" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "story.next" })).toBeInTheDocument();
    expect(screen.getByText("story.visitCountLabel:6")).toBeInTheDocument();
    expect(screen.getByText("story.tripCountLabel:3")).toBeInTheDocument();
    expect(screen.getByText("31.7.-6.8.2026")).toBeInTheDocument();
    expect(within(revisitedCard).queryByText("Käynti 4. elokuuta 2026")).not.toBeInTheDocument();
    expect(within(revisitedCard).getByText("4. elokuuta 2026")).toBeInTheDocument();
    expect(
      within(revisitedCard).getByText("Edellinen käynti 24. elokuuta 2024"),
    ).toBeInTheDocument();
    expect(within(revisitedCard).getByText("Käyntejä yhteensä 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Saaristoretki" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Örön linnakesaari" })).toBeInTheDocument();
    expect(screen.getByText("story.otherVisitsTitle")).toBeInTheDocument();
    expect(screen.getByText("story.otherVisitsHeading")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aulanko" })).toBeInTheDocument();
    expect(within(firstTripCard).queryByText("Käynti 1.8.2026")).not.toBeInTheDocument();
    expect(within(firstTripCard).getAllByText("1.8.2026")).toHaveLength(3);
    expect(within(otherVisitsCard).queryByText("Käynti 6.8.2026")).not.toBeInTheDocument();
    expect(within(otherVisitsCard).getByText("6.8.2026")).toBeInTheDocument();
  });

  it("keeps the second card active after the first next click with shorter cards", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();

    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollTo,
      writable: true,
    });
    setScrollState({ scrollY: 0 });
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(
      <DateRangeReviewStory
        mode="public"
        overview={overview}
        publishedAt="2026-08-07T09:00:00Z"
        story={story}
      />,
    );

    const storyElement = screen.getByTestId("date-range-review-story");
    const navigationPanel = screen.getByLabelText("story.progressNavigator").closest("div");
    const secondCard = screen.getByTestId("date-range-review-story-card-1");
    const thirdCard = screen.getByTestId("date-range-review-story-card-2");

    if (!(navigationPanel && secondCard && thirdCard)) {
      throw new Error("Expected the navigation panel and target cards to exist.");
    }

    vi.spyOn(storyElement, "getBoundingClientRect").mockImplementation(() => ({
      bottom: 1008 - window.scrollY,
      height: 960,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 48 - window.scrollY,
      width: 0,
      x: 0,
      y: 48 - window.scrollY,
    }));
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
    vi.spyOn(secondCard, "getBoundingClientRect").mockImplementation(() => ({
      bottom: 880 - window.scrollY,
      height: 320,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 560 - window.scrollY,
      width: 0,
      x: 0,
      y: 560 - window.scrollY,
    }));
    vi.spyOn(thirdCard, "getBoundingClientRect").mockImplementation(() => ({
      bottom: 1272 - window.scrollY,
      height: 420,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 852 - window.scrollY,
      width: 0,
      x: 0,
      y: 852 - window.scrollY,
    }));

    const nextButton = screen.getByRole("button", { name: "story.next" });

    await user.click(nextButton);

    expect(screen.getByText("Kesaloma 2026 2/8")).toBeInTheDocument();

    triggerIntersections([
      {
        intersectionRatio: 0.32,
        target: secondCard,
        top: 128,
      },
      {
        intersectionRatio: 0.84,
        target: thirdCard,
        top: 420,
      },
    ]);

    expect(screen.getByText("Kesaloma 2026 2/8")).toBeInTheDocument();
    expect(screen.queryByText("Kesaloma 2026 1/8")).not.toBeInTheDocument();

    setScrollState({ scrollY: 432 });

    triggerIntersections([
      {
        intersectionRatio: 0.32,
        target: secondCard,
        top: 128,
      },
      {
        intersectionRatio: 0.84,
        target: thirdCard,
        top: 420,
      },
    ]);

    expect(screen.getByText("Kesaloma 2026 2/8")).toBeInTheDocument();
    expect(screen.queryByText("Kesaloma 2026 3/8")).not.toBeInTheDocument();
  });

  it("renders the empty state when the period has no visits", () => {
    render(
      <DateRangeReviewStory
        mode="public"
        overview={overview}
        story={{
          cards: [],
          summary: {
            distinctParkCount: 0,
            imageCount: 0,
            newNationalParkCount: 0,
            revisitedParkCount: 0,
            tripCount: 0,
            visitCount: 0,
          },
        }}
      />,
    );

    expect(screen.getByText("story.emptyDescription")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "story.next" })).not.toBeInTheDocument();
  });

  it("renders photo, park, and trip detail branches when optional content exists", () => {
    render(
      <DateRangeReviewStory
        mode="public"
        overview={overview}
        story={{
          cards: [
            story.cards[0],
            {
              featuredImage: {
                alt: "Kesamuisto",
                fullHeight: 900,
                fullUrl: "https://images.example/photo.jpg",
                fullWidth: 1400,
                thumbHeight: null,
                thumbUrl: "https://images.example/photo-thumb.jpg",
                thumbWidth: null,
              },
              kind: "photo-highlight",
              totalImageCount: 9,
              visit: {
                id: 10,
                imageCount: 4,
                park: {
                  name: "Nuuksion kansallispuisto",
                  slug: "nuuksio",
                },
                route: "Haukanholma",
                trip: {
                  id: 20,
                  name: "Nuuksioviikonloppu",
                  slug: "nuuksioviikonloppu",
                },
                visitedOn: "2026-08-02",
              },
            },
            {
              kind: "new-parks",
              parks: [
                {
                  featuredImage: {
                    alt: "Puistokuva",
                    fullHeight: 900,
                    fullUrl: "https://images.example/park.jpg",
                    fullWidth: 1400,
                    thumbHeight: null,
                    thumbUrl: "https://images.example/park-thumb.jpg",
                    thumbWidth: null,
                  },
                  park: {
                    name: "Lemmenjoen kansallispuisto",
                    slug: "lemmenjoki",
                  },
                  visitedOn: "2026-08-03",
                },
              ],
            },
            {
              kind: "revisited-parks",
              parks: [
                {
                  featuredImage: {
                    alt: "Paluukuva",
                    fullHeight: 900,
                    fullUrl: "https://images.example/revisit.jpg",
                    fullWidth: 1400,
                    thumbHeight: null,
                    thumbUrl: "https://images.example/revisit-thumb.jpg",
                    thumbWidth: null,
                  },
                  park: {
                    name: "Oulangan kansallispuisto",
                    slug: "oulanka",
                  },
                  previousVisitDate: "2024-07-10",
                  revisitCount: 2,
                  visitedOn: "2026-08-04",
                },
              ],
            },
            {
              featuredImage: {
                alt: "Retkikuva",
                fullHeight: 900,
                fullUrl: "https://images.example/trip.jpg",
                fullWidth: 1400,
                thumbHeight: null,
                thumbUrl: "https://images.example/trip-thumb.jpg",
                thumbWidth: null,
              },
              kind: "trip-summary",
              trip: {
                dateRange: null,
                id: 30,
                imageCount: 5,
                name: "Yopymisretki",
                slug: "yopymisretki",
                visits: [
                  {
                    park: {
                      name: "Patvinsuon kansallispuisto",
                      slug: "patvinsuo",
                      typeLabel: "Kansallispuisto",
                      typeSlug: "kansallispuisto",
                    },
                    visitedOn: "2026-08-05",
                  },
                ],
                visitCount: 3,
              },
            },
            {
              kind: "other-visits",
              visits: [
                {
                  park: {
                    name: "Aavasaksa",
                    slug: "aavasaksa",
                    typeLabel: "Maisemakohde",
                    typeSlug: "maisemakohde",
                  },
                  visitedOn: "2026-08-06",
                },
              ],
            },
          ],
          summary: {
            distinctParkCount: 4,
            imageCount: 9,
            newNationalParkCount: 1,
            revisitedParkCount: 1,
            tripCount: 1,
            visitCount: 4,
          },
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "Kesamuisto" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nuuksion kansallispuisto" })).toBeInTheDocument();
    expect(screen.getByText(/Haukanholma/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nuuksioviikonloppu" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Puistokuva" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Paluukuva" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Retkikuva" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Patvinsuon kansallispuisto" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Aavasaksa" })).toBeInTheDocument();
    expect(screen.queryByText("Käynti 3.8.2026")).not.toBeInTheDocument();
    expect(screen.queryByText("Käynti 4.8.2026")).not.toBeInTheDocument();
    expect(screen.queryByText("story.photoFallback")).not.toBeInTheDocument();
  });
});
