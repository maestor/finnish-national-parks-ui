import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useStoryProgressNavigation } from "./use-story-progress-navigation";

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

const triggerIntersection = (target: Element, top: number, intersectionRatio = 0.8) => {
  if (intersectionCallbacks.length === 0) {
    throw new Error("Expected an intersection observer callback to be registered.");
  }

  act(() => {
    for (const callback of intersectionCallbacks) {
      callback(
        [
          {
            boundingClientRect: {
              bottom: top + 100,
              height: 100,
              left: 0,
              right: 0,
              toJSON: () => ({}),
              top,
              width: 0,
              x: 0,
              y: top,
            },
            intersectionRatio,
            isIntersecting: true,
            target,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    }
  });
};

const triggerIntersections = (
  entries: Array<{
    intersectionRatio: number;
    isIntersecting?: boolean;
    target: Element;
    top: number;
  }>,
) => {
  if (intersectionCallbacks.length === 0) {
    throw new Error("Expected an intersection observer callback to be registered.");
  }

  act(() => {
    for (const callback of intersectionCallbacks) {
      callback(
        entries.map((entry) => ({
          boundingClientRect: {
            bottom: entry.top + 100,
            height: 100,
            left: 0,
            right: 0,
            toJSON: () => ({}),
            top: entry.top,
            width: 0,
            x: 0,
            y: entry.top,
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

const dispatchScroll = () => {
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
};

const StoryHarness = ({
  cardCount = 3,
  withNavigation = true,
  withSections = true,
}: {
  cardCount?: number;
  withNavigation?: boolean;
  withSections?: boolean;
}) => {
  const {
    activeIndex,
    handleStepButtonNavigation,
    navigationRef,
    progressButtonRefs,
    scrollToCard,
    sectionRefs,
    storyRef,
    visibleIndex,
  } = useStoryProgressNavigation({
    cardCount,
  });
  const cardIds = Array.from({ length: cardCount }, (_, index) => `card-${index}`);

  return (
    <div ref={storyRef} data-testid="story-root">
      <p data-testid="active-index">{activeIndex}</p>
      <p data-testid="visible-index">{visibleIndex}</p>

      <button type="button" onClick={() => scrollToCard(0)}>
        external-first
      </button>
      <button type="button" onClick={() => scrollToCard(1)}>
        external-second
      </button>

      {withNavigation === true && (
        <div ref={navigationRef} data-testid="navigation">
          {cardIds.map((cardId, index) => (
            <button
              key={cardId}
              ref={(element) => {
                progressButtonRefs.current[index] = element;
              }}
              type="button"
              onClick={(event) => {
                handleStepButtonNavigation(index, event.currentTarget);
              }}
            >
              {`go-${index}`}
            </button>
          ))}
        </div>
      )}

      {withSections === true &&
        cardIds.map((cardId, index) => (
          <section
            key={cardId}
            ref={(element) => {
              sectionRefs.current[index] = element;
            }}
            data-card-index={index}
            data-testid={`section-${index}`}
          />
        ))}
    </div>
  );
};

describe("useStoryProgressNavigation", () => {
  it("returns early when a target section or navigation container is missing", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();

    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollTo,
      writable: true,
    });
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<StoryHarness withNavigation={false} />);

    await user.click(screen.getByRole("button", { name: "external-second" }));

    expect(scrollTo).not.toHaveBeenCalled();
    expect(screen.getByTestId("active-index")).toHaveTextContent("0");
  });

  it("does not scroll when the first card is already aligned at the story top", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();

    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollTo,
      writable: true,
    });
    setScrollState({ scrollY: 48 });
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<StoryHarness />);

    const storyRoot = screen.getByTestId("story-root");
    const navigation = screen.getByTestId("navigation");
    const firstSection = screen.getByTestId("section-0");

    vi.spyOn(storyRoot, "getBoundingClientRect").mockReturnValue({
      bottom: 960,
      height: 960,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 0,
      width: 0,
      x: 0,
      y: 0,
    });
    vi.spyOn(navigation, "getBoundingClientRect").mockReturnValue({
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
    vi.spyOn(firstSection, "getBoundingClientRect").mockReturnValue({
      bottom: 320,
      height: 320,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 0,
      width: 0,
      x: 0,
      y: 0,
    });

    await user.click(screen.getByRole("button", { name: "go-0" }));

    expect(scrollTo).not.toHaveBeenCalled();
    expect(screen.getByTestId("active-index")).toHaveTextContent("0");
  });

  it("does not scroll again when a non-first card is already aligned below the navigation", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();

    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollTo,
      writable: true,
    });
    setScrollState({ scrollY: 432 });
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<StoryHarness />);

    const navigation = screen.getByTestId("navigation");
    const secondSection = screen.getByTestId("section-1");

    vi.spyOn(navigation, "getBoundingClientRect").mockReturnValue({
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
    vi.spyOn(secondSection, "getBoundingClientRect").mockReturnValue({
      bottom: 560,
      height: 320,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 128,
      width: 0,
      x: 0,
      y: 128,
    });

    await user.click(screen.getByRole("button", { name: "go-1" }));

    expect(scrollTo).not.toHaveBeenCalled();
    expect(screen.getByTestId("active-index")).toHaveTextContent("1");
  });

  it("clears a pending target in the observer once the target scroll position has been reached", async () => {
    const user = userEvent.setup();
    const scrollTo = vi.fn();

    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollTo,
      writable: true,
    });
    setScrollState({ scrollY: 0 });
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<StoryHarness />);

    const storyRoot = screen.getByTestId("story-root");
    const navigation = screen.getByTestId("navigation");
    const secondSection = screen.getByTestId("section-1");
    const thirdSection = screen.getByTestId("section-2");

    vi.spyOn(storyRoot, "getBoundingClientRect").mockImplementation(() => ({
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
    vi.spyOn(navigation, "getBoundingClientRect").mockReturnValue({
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
    vi.spyOn(secondSection, "getBoundingClientRect").mockImplementation(() => ({
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
    vi.spyOn(thirdSection, "getBoundingClientRect").mockImplementation(() => ({
      bottom: 1200 - window.scrollY,
      height: 320,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 880 - window.scrollY,
      width: 0,
      x: 0,
      y: 880 - window.scrollY,
    }));

    await user.click(screen.getByRole("button", { name: "go-1" }));

    setScrollState({ scrollY: 432 });
    triggerIntersection(secondSection, 128);

    expect(screen.getByTestId("active-index")).toHaveTextContent("1");
    expect(scrollTo).toHaveBeenCalledWith({
      behavior: "auto",
      top: 432,
    });
  });

  it("keeps the first card active when observer updates arrive at the top edge", () => {
    setScrollState({ scrollY: 0 });
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<StoryHarness />);

    const storyRoot = screen.getByTestId("story-root");
    const secondSection = screen.getByTestId("section-1");

    vi.spyOn(storyRoot, "getBoundingClientRect").mockReturnValue({
      bottom: 1008,
      height: 960,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 48,
      width: 0,
      x: 0,
      y: 48,
    });

    triggerIntersection(secondSection, 120);

    expect(screen.getByTestId("active-index")).toHaveTextContent("0");
  });

  it("updates the active card from viewport positions while scrolling through the story", () => {
    setScrollState({ scrollY: 500 });
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<StoryHarness />);

    const storyRoot = screen.getByTestId("story-root");
    const navigation = screen.getByTestId("navigation");
    const firstSection = screen.getByTestId("section-0");
    const secondSection = screen.getByTestId("section-1");
    const thirdSection = screen.getByTestId("section-2");

    vi.spyOn(storyRoot, "getBoundingClientRect").mockImplementation(() => ({
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
    vi.spyOn(navigation, "getBoundingClientRect").mockReturnValue({
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
    vi.spyOn(firstSection, "getBoundingClientRect").mockReturnValue({
      bottom: -80,
      height: 320,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: -400,
      width: 0,
      x: 0,
      y: -400,
    });
    vi.spyOn(secondSection, "getBoundingClientRect").mockReturnValue({
      bottom: 448,
      height: 320,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 128,
      width: 0,
      x: 0,
      y: 128,
    });
    vi.spyOn(thirdSection, "getBoundingClientRect").mockReturnValue({
      bottom: 840,
      height: 320,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 520,
      width: 0,
      x: 0,
      y: 520,
    });

    dispatchScroll();

    expect(screen.getByTestId("active-index")).toHaveTextContent("1");
    expect(screen.getByTestId("visible-index")).toHaveTextContent("1");
  });

  it("reveals a tall active card as soon as it becomes the scroll-active card", () => {
    setScrollState({ innerHeight: 640, scrollY: 780 });
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<StoryHarness />);

    const storyRoot = screen.getByTestId("story-root");
    const navigation = screen.getByTestId("navigation");
    const firstSection = screen.getByTestId("section-0");
    const secondSection = screen.getByTestId("section-1");
    const thirdSection = screen.getByTestId("section-2");

    vi.spyOn(storyRoot, "getBoundingClientRect").mockImplementation(() => ({
      bottom: 2600 - window.scrollY,
      height: 2552,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 48 - window.scrollY,
      width: 0,
      x: 0,
      y: 48 - window.scrollY,
    }));
    vi.spyOn(navigation, "getBoundingClientRect").mockReturnValue({
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
    vi.spyOn(firstSection, "getBoundingClientRect").mockReturnValue({
      bottom: -200,
      height: 720,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: -920,
      width: 0,
      x: 0,
      y: -920,
    });
    vi.spyOn(secondSection, "getBoundingClientRect").mockReturnValue({
      bottom: 920,
      height: 1120,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: -200,
      width: 0,
      x: 0,
      y: -200,
    });
    vi.spyOn(thirdSection, "getBoundingClientRect").mockReturnValue({
      bottom: 1600,
      height: 840,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 760,
      width: 0,
      x: 0,
      y: 760,
    });

    dispatchScroll();

    expect(screen.getByTestId("active-index")).toHaveTextContent("1");
    expect(screen.getByTestId("visible-index")).toHaveTextContent("1");
  });

  it("reveals the next card before it becomes the active card while scrolling", () => {
    setScrollState({ scrollY: 500 });
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<StoryHarness />);

    const storyRoot = screen.getByTestId("story-root");
    const navigation = screen.getByTestId("navigation");
    const firstSection = screen.getByTestId("section-0");
    const secondSection = screen.getByTestId("section-1");
    const thirdSection = screen.getByTestId("section-2");

    vi.spyOn(storyRoot, "getBoundingClientRect").mockImplementation(() => ({
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
    vi.spyOn(navigation, "getBoundingClientRect").mockReturnValue({
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
    vi.spyOn(firstSection, "getBoundingClientRect").mockReturnValue({
      bottom: -140,
      height: 320,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: -460,
      width: 0,
      x: 0,
      y: -460,
    });
    vi.spyOn(secondSection, "getBoundingClientRect").mockReturnValue({
      bottom: 548,
      height: 320,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 228,
      width: 0,
      x: 0,
      y: 228,
    });
    vi.spyOn(thirdSection, "getBoundingClientRect").mockReturnValue({
      bottom: 940,
      height: 320,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 620,
      width: 0,
      x: 0,
      y: 620,
    });

    dispatchScroll();

    expect(screen.getByTestId("active-index")).toHaveTextContent("0");
    expect(screen.getByTestId("visible-index")).toHaveTextContent("1");
  });

  it("falls back to the nearest below card when every section starts below the navigation anchor", () => {
    setScrollState({ scrollY: 500 });
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<StoryHarness />);

    const storyRoot = screen.getByTestId("story-root");
    const navigation = screen.getByTestId("navigation");
    const firstSection = screen.getByTestId("section-0");
    const secondSection = screen.getByTestId("section-1");
    const thirdSection = screen.getByTestId("section-2");

    vi.spyOn(storyRoot, "getBoundingClientRect").mockImplementation(() => ({
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
    vi.spyOn(navigation, "getBoundingClientRect").mockReturnValue({
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
    vi.spyOn(firstSection, "getBoundingClientRect").mockReturnValue({
      bottom: 700,
      height: 320,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 380,
      width: 0,
      x: 0,
      y: 380,
    });
    vi.spyOn(secondSection, "getBoundingClientRect").mockReturnValue({
      bottom: 920,
      height: 320,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 600,
      width: 0,
      x: 0,
      y: 600,
    });
    vi.spyOn(thirdSection, "getBoundingClientRect").mockReturnValue({
      bottom: 1140,
      height: 320,
      left: 0,
      right: 0,
      toJSON: () => ({}),
      top: 820,
      width: 0,
      x: 0,
      y: 820,
    });

    dispatchScroll();

    expect(screen.getByTestId("active-index")).toHaveTextContent("0");
  });

  it("falls back to the highest intersection ratio when observer updates arrive without a navigation anchor", () => {
    setScrollState({ scrollY: 500 });
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

    render(<StoryHarness withNavigation={false} />);

    const storyRoot = screen.getByTestId("story-root");
    const firstSection = screen.getByTestId("section-0");
    const secondSection = screen.getByTestId("section-1");

    vi.spyOn(storyRoot, "getBoundingClientRect").mockImplementation(() => ({
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

    triggerIntersections([
      {
        intersectionRatio: 0.35,
        target: firstSection,
        top: 120,
      },
      {
        intersectionRatio: 0.85,
        target: secondSection,
        top: 420,
      },
    ]);

    expect(screen.getByTestId("active-index")).toHaveTextContent("1");
  });
});
