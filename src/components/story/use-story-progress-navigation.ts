"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseStoryProgressNavigationOptions {
  cardCount: number;
  getScrollBehavior?: () => ScrollBehavior;
}

const CARD_SCROLL_GAP_PX = 20;
const EDGE_TOLERANCE_PX = 4;
const MIN_REVEAL_LEAD_PX = 96;
const MAX_REVEAL_ANCHOR_TOP_PX = 620;
const VIEWPORT_REVEAL_RATIO = 0.56;

const getMaxScrollTop = () =>
  Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);

const resolveCardIndex = (target: Element) => {
  const parsedValue = Number.parseInt(target.getAttribute("data-card-index") ?? "", 10);

  return Number.isInteger(parsedValue) ? parsedValue : null;
};

export const useStoryProgressNavigation = ({
  cardCount,
  getScrollBehavior = () => "auto",
}: UseStoryProgressNavigationOptions) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const progressButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const storyRef = useRef<HTMLDivElement | null>(null);
  const navigationRef = useRef<HTMLDivElement | null>(null);
  const pendingTargetIndexRef = useRef<number | null>(null);
  const pendingScrollTopRef = useRef<number | null>(null);

  const clearPendingTarget = useCallback(() => {
    pendingTargetIndexRef.current = null;
    pendingScrollTopRef.current = null;
  }, []);

  const hasReachedPendingTarget = useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const pendingScrollTop = pendingScrollTopRef.current;

    if (pendingScrollTop === null) {
      return false;
    }

    return Math.abs(window.scrollY - pendingScrollTop) <= EDGE_TOLERANCE_PX;
  }, []);

  const getEdgeIndex = useCallback(() => {
    if (typeof window === "undefined" || cardCount === 0) {
      return null;
    }

    const story = storyRef.current;

    if (!story) {
      return null;
    }

    const storyTop = story.getBoundingClientRect().top + window.scrollY;

    if (window.scrollY <= storyTop + EDGE_TOLERANCE_PX) {
      return 0;
    }

    if (window.scrollY >= getMaxScrollTop() - EDGE_TOLERANCE_PX) {
      return cardCount - 1;
    }

    return null;
  }, [cardCount]);

  const getNavigationAnchorTop = useCallback(() => {
    const navigation = navigationRef.current;

    if (!navigation) {
      return null;
    }

    const navigationRect = navigation.getBoundingClientRect();

    return navigationRect.top + navigationRect.height + CARD_SCROLL_GAP_PX;
  }, []);

  const getRevealAnchorTop = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const anchorTop = getNavigationAnchorTop();

    if (anchorTop === null) {
      return null;
    }

    return Math.max(
      anchorTop + MIN_REVEAL_LEAD_PX,
      Math.min(window.innerHeight * VIEWPORT_REVEAL_RATIO, MAX_REVEAL_ANCHOR_TOP_PX),
    );
  }, [getNavigationAnchorTop]);

  const getViewportIndexAtAnchor = useCallback(
    (anchorTop: number) => {
      if (cardCount === 0) {
        return null;
      }

      let nearestAboveIndex: number | null = null;
      let nearestAboveTop = Number.NEGATIVE_INFINITY;
      let nearestBelowIndex: number | null = null;
      let nearestBelowTop = Number.POSITIVE_INFINITY;

      for (const [index, section] of sectionRefs.current.entries()) {
        if (!section) {
          continue;
        }

        const sectionTop = section.getBoundingClientRect().top;

        if (sectionTop <= anchorTop + EDGE_TOLERANCE_PX && sectionTop > nearestAboveTop) {
          nearestAboveIndex = index;
          nearestAboveTop = sectionTop;
          continue;
        }

        if (sectionTop > anchorTop + EDGE_TOLERANCE_PX && sectionTop < nearestBelowTop) {
          nearestBelowIndex = index;
          nearestBelowTop = sectionTop;
        }
      }

      if (nearestAboveIndex !== null) {
        return nearestAboveIndex;
      }

      return nearestBelowIndex;
    },
    [cardCount],
  );

  const getViewportActiveIndex = useCallback(() => {
    const anchorTop = getNavigationAnchorTop();

    if (anchorTop === null) {
      return null;
    }

    return getViewportIndexAtAnchor(anchorTop);
  }, [getNavigationAnchorTop, getViewportIndexAtAnchor]);

  const getViewportVisibleIndex = useCallback(() => {
    const revealAnchorTop = getRevealAnchorTop();

    if (revealAnchorTop === null) {
      return null;
    }

    return getViewportIndexAtAnchor(revealAnchorTop);
  }, [getRevealAnchorTop, getViewportIndexAtAnchor]);

  const getEntryActiveIndex = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const intersectingEntries = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => ({
          index: resolveCardIndex(entry.target),
          intersectionRatio: entry.intersectionRatio,
          top:
            "boundingClientRect" in entry && entry.boundingClientRect
              ? entry.boundingClientRect.top
              : entry.target.getBoundingClientRect().top,
        }))
        .filter(
          (entry): entry is { index: number; intersectionRatio: number; top: number } =>
            entry.index !== null,
        );

      if (intersectingEntries.length === 0) {
        return null;
      }

      if (intersectingEntries.length === 1) {
        return intersectingEntries[0].index;
      }

      const anchorTop = getNavigationAnchorTop();

      if (anchorTop !== null) {
        const nearestAboveEntry = intersectingEntries
          .filter((entry) => entry.top <= anchorTop + EDGE_TOLERANCE_PX)
          .sort((left, right) => right.top - left.top)[0];

        if (nearestAboveEntry) {
          return nearestAboveEntry.index;
        }

        const nearestBelowEntry = intersectingEntries.sort(
          (left, right) => left.top - right.top,
        )[0];

        if (nearestBelowEntry) {
          return nearestBelowEntry.index;
        }
      }

      return intersectingEntries.sort(
        (left, right) => right.intersectionRatio - left.intersectionRatio,
      )[0]?.index;
    },
    [getNavigationAnchorTop],
  );

  const syncEdgeActiveIndex = useCallback(() => {
    const edgeIndex = getEdgeIndex();

    if (edgeIndex === null) {
      return false;
    }

    clearPendingTarget();
    setActiveIndex((currentIndex) => (currentIndex === edgeIndex ? currentIndex : edgeIndex));
    setVisibleIndex((currentIndex) => (currentIndex === edgeIndex ? currentIndex : edgeIndex));

    return true;
  }, [clearPendingTarget, getEdgeIndex]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const pendingTargetIndex = pendingTargetIndexRef.current;

        if (pendingTargetIndex !== null) {
          if (hasReachedPendingTarget()) {
            clearPendingTarget();
            setActiveIndex((currentIndex) =>
              currentIndex === pendingTargetIndex ? currentIndex : pendingTargetIndex,
            );
            setVisibleIndex((currentIndex) =>
              currentIndex === pendingTargetIndex ? currentIndex : pendingTargetIndex,
            );

            return;
          }

          setActiveIndex((currentIndex) =>
            currentIndex === pendingTargetIndex ? currentIndex : pendingTargetIndex,
          );
          return;
        }

        if (syncEdgeActiveIndex()) {
          return;
        }

        const nextIndex = getEntryActiveIndex(entries);

        if (nextIndex !== null) {
          setActiveIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
        }
      },
      {
        rootMargin: "-12% 0px -18% 0px",
        threshold: [0.15, 0.35, 0.55, 0.75],
      },
    );

    for (const section of sectionRefs.current) {
      if (section) {
        observer.observe(section);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [clearPendingTarget, getEntryActiveIndex, hasReachedPendingTarget, syncEdgeActiveIndex]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleScroll = () => {
      if (pendingTargetIndexRef.current !== null) {
        if (hasReachedPendingTarget()) {
          const pendingTargetIndex = pendingTargetIndexRef.current;

          clearPendingTarget();
          setActiveIndex((currentIndex) =>
            currentIndex === pendingTargetIndex ? currentIndex : pendingTargetIndex,
          );
          setVisibleIndex((currentIndex) =>
            currentIndex === pendingTargetIndex ? currentIndex : pendingTargetIndex,
          );
        }

        return;
      }

      if (syncEdgeActiveIndex()) {
        return;
      }

      const nextActiveIndex = getViewportActiveIndex();
      const nextVisibleIndex = getViewportVisibleIndex();

      if (nextActiveIndex !== null) {
        setActiveIndex((currentIndex) =>
          currentIndex === nextActiveIndex ? currentIndex : nextActiveIndex,
        );
      }

      if (nextVisibleIndex !== null) {
        setVisibleIndex((currentIndex) =>
          currentIndex === nextVisibleIndex ? currentIndex : nextVisibleIndex,
        );
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [
    clearPendingTarget,
    getViewportActiveIndex,
    getViewportVisibleIndex,
    hasReachedPendingTarget,
    syncEdgeActiveIndex,
  ]);

  useEffect(() => {
    progressButtonRefs.current = progressButtonRefs.current.slice(0, cardCount);
    sectionRefs.current = sectionRefs.current.slice(0, cardCount);
    clearPendingTarget();
    setActiveIndex(0);
    setVisibleIndex(0);
  }, [cardCount, clearPendingTarget]);

  const scrollToPosition = (top: number) => {
    window.scrollTo({
      behavior: getScrollBehavior(),
      top,
    });
  };

  const scrollToCard = (index: number) => {
    if (typeof window === "undefined") {
      return;
    }

    const nextSection = sectionRefs.current[index];
    const navigation = navigationRef.current;

    if (!(nextSection && navigation)) {
      return;
    }

    pendingTargetIndexRef.current = index;
    setActiveIndex(index);

    if (index === 0) {
      const storyTop = storyRef.current?.getBoundingClientRect().top ?? 0;
      const scrollTarget = Math.max(storyTop + window.scrollY, 0);

      pendingScrollTopRef.current = scrollTarget;

      if (Math.abs(scrollTarget - window.scrollY) <= EDGE_TOLERANCE_PX) {
        clearPendingTarget();
        setVisibleIndex(index);
        return;
      }

      scrollToPosition(scrollTarget);
      return;
    }

    const navigationRect = navigation.getBoundingClientRect();
    const sectionTop = nextSection.getBoundingClientRect().top + window.scrollY;
    const scrollTarget = Math.min(
      Math.max(sectionTop - (navigationRect.top + navigationRect.height + CARD_SCROLL_GAP_PX), 0),
      getMaxScrollTop(),
    );

    pendingScrollTopRef.current = scrollTarget;

    if (Math.abs(scrollTarget - window.scrollY) <= EDGE_TOLERANCE_PX) {
      clearPendingTarget();
      setVisibleIndex(index);
      return;
    }

    scrollToPosition(scrollTarget);
  };

  const handleStepButtonNavigation = (targetIndex: number, button: HTMLButtonElement | null) => {
    button?.blur();
    progressButtonRefs.current[targetIndex]?.focus({ preventScroll: true });
    scrollToCard(targetIndex);
  };

  return {
    activeIndex,
    handleStepButtonNavigation,
    navigationRef,
    progressButtonRefs,
    scrollToCard,
    sectionRefs,
    storyRef,
    visibleIndex,
  };
};
