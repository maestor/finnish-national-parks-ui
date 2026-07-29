"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface StickySectionNavigationItem {
  id: string;
  label: string;
}

interface StickySectionNavigationProps {
  ariaLabel: string;
  className?: string;
  items: StickySectionNavigationItem[];
  onHeightChange?: (height: number) => void;
  topOffset?: string;
}

interface VisibleSection {
  id: string;
  top: number;
  visibleHeight: number;
}

const SECTION_NAV_CONTAINER_CLASS_NAME =
  "rounded-full border border-white/45 bg-white/76 p-1 shadow-[0_14px_30px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/72 dark:shadow-[0_16px_32px_rgba(2,6,23,0.28)]";
const SECTION_NAV_LINK_CLASS_NAME =
  "inline-flex min-w-0 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";
const ACTIVE_SECTION_NAV_LINK_CLASS_NAME =
  "bg-white text-foreground shadow-[0_10px_22px_rgba(148,163,184,0.2)] dark:bg-slate-900 dark:text-white";
const HEADER_VISIBLE_OFFSET_PX = 56;
const HEADER_HIDDEN_OFFSET_PX = 0;

const getActiveSectionIdFromViewport = (
  sectionElements: HTMLElement[],
  stickyNavBottom: number,
  viewportHeight: number,
) => {
  const viewportTop = stickyNavBottom + 8;
  const viewportBottom = viewportHeight;
  let mostVisibleSection: VisibleSection | null = null;

  for (const sectionElement of sectionElements) {
    const { bottom, top } = sectionElement.getBoundingClientRect();
    const visibleHeight = Math.max(
      0,
      Math.min(bottom, viewportBottom) - Math.max(top, viewportTop),
    );

    if (
      mostVisibleSection === null ||
      visibleHeight > mostVisibleSection.visibleHeight ||
      (visibleHeight === mostVisibleSection.visibleHeight && top > mostVisibleSection.top)
    ) {
      mostVisibleSection = {
        id: sectionElement.id,
        top,
        visibleHeight,
      };
    }
  }

  if (mostVisibleSection !== null && mostVisibleSection.visibleHeight > 0) {
    return mostVisibleSection.id;
  }

  return (
    [...sectionElements]
      .reverse()
      .find((sectionElement) => sectionElement.getBoundingClientRect().top <= viewportTop)?.id ??
    sectionElements[0]?.id
  );
};

export const StickySectionNavigation = ({
  ariaLabel,
  className,
  items,
  onHeightChange,
  topOffset = "var(--page-sticky-nav-top, 0.5rem)",
}: StickySectionNavigationProps) => {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(items[0]?.id ?? null);
  const sectionNavigationRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setActiveSectionId(items[0]?.id ?? null);
  }, [items]);

  useEffect(() => {
    if (items.length < 2) {
      onHeightChange?.(0);
      return;
    }

    const updateStickySectionNavHeight = () => {
      onHeightChange?.(sectionNavigationRef.current?.offsetHeight ?? 0);
    };

    updateStickySectionNavHeight();
    window.addEventListener("resize", updateStickySectionNavHeight);

    return () => {
      window.removeEventListener("resize", updateStickySectionNavHeight);
      onHeightChange?.(0);
    };
  }, [items, onHeightChange]);

  useEffect(() => {
    if (items.length < 2) {
      return;
    }

    const sectionElements = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);

    if (sectionElements.length === 0) {
      return;
    }

    let animationFrameId: number | null = null;

    const updateActiveSectionFromScroll = () => {
      const stickyNavBottom = sectionNavigationRef.current?.getBoundingClientRect().bottom ?? 0;
      const nextActiveSection = getActiveSectionIdFromViewport(
        sectionElements,
        stickyNavBottom,
        window.innerHeight,
      );

      if (nextActiveSection !== undefined) {
        setActiveSectionId((currentActiveSectionId) =>
          currentActiveSectionId === nextActiveSection ? currentActiveSectionId : nextActiveSection,
        );
      }
    };

    const scheduleActiveSectionUpdate = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(() => {
        updateActiveSectionFromScroll();
        animationFrameId = null;
      });
    };

    updateActiveSectionFromScroll();
    window.addEventListener("scroll", scheduleActiveSectionUpdate, { passive: true });
    window.addEventListener("resize", scheduleActiveSectionUpdate);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener("scroll", scheduleActiveSectionUpdate);
      window.removeEventListener("resize", scheduleActiveSectionUpdate);
    };
  }, [items]);

  if (items.length < 2) {
    return null;
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={`sticky z-40 px-1 ${className ?? ""}`}
      ref={sectionNavigationRef}
      style={{ top: topOffset }}
    >
      <div className={SECTION_NAV_CONTAINER_CLASS_NAME}>
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
          }}
        >
          {items.map((item) => {
            const isActive = activeSectionId === item.id;

            return (
              <Link
                key={item.id}
                aria-current={isActive ? "location" : undefined}
                className={`${SECTION_NAV_LINK_CLASS_NAME} ${isActive ? ACTIVE_SECTION_NAV_LINK_CLASS_NAME : "hover:bg-white/72 hover:text-foreground dark:hover:bg-slate-900/72 dark:hover:text-white"}`}
                href={`#${item.id}`}
                onClick={(event) => {
                  const targetSection = document.getElementById(item.id);

                  if (targetSection === null) {
                    return;
                  }

                  event.preventDefault();

                  const targetSectionTop =
                    window.scrollY + targetSection.getBoundingClientRect().top;
                  const currentNavHeight = sectionNavigationRef.current?.offsetHeight ?? 0;
                  const isScrollingUp = targetSectionTop < window.scrollY;
                  const headerOffsetPx =
                    isScrollingUp || targetSectionTop <= HEADER_VISIBLE_OFFSET_PX
                      ? HEADER_VISIBLE_OFFSET_PX
                      : HEADER_HIDDEN_OFFSET_PX;
                  const nextScrollTop = Math.max(
                    targetSectionTop - headerOffsetPx - currentNavHeight,
                    0,
                  );
                  const prefersReducedMotion = window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches;

                  window.history.pushState(null, "", `#${item.id}`);
                  window.scrollTo({
                    top: nextScrollTop,
                    behavior: prefersReducedMotion ? "auto" : "smooth",
                  });
                  setActiveSectionId(item.id);
                }}
              >
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
