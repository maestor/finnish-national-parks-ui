"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface StickySectionNavigationItem {
  id: string;
  initialTargetId?: string;
  label: string;
}

interface StickySectionNavigationProps {
  ariaLabel: string;
  className?: string;
  items: StickySectionNavigationItem[];
  onHeightChange?: (height: number) => void;
  topOffset?: string;
}

const SECTION_NAV_CONTAINER_CLASS_NAME =
  "rounded-full border border-border bg-control p-1 shadow-[0_14px_30px_rgba(var(--shadow-rgb),0.14)] backdrop-blur-xl dark:shadow-[0_16px_32px_rgba(var(--shadow-rgb),0.28)]";
const SECTION_NAV_LINK_CLASS_NAME =
  "inline-flex min-w-0 items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";
const ACTIVE_SECTION_NAV_LINK_CLASS_NAME =
  "theme-action text-action-foreground shadow-[0_10px_22px_rgba(var(--shadow-rgb),0.2)]";
const HEADER_VISIBLE_OFFSET_PX = 56;
const HEADER_HIDDEN_OFFSET_PX = 0;

const getActiveSectionIdFromViewport = (
  sectionElements: HTMLElement[],
  stickyNavBottom: number,
) => {
  const viewportTop = stickyNavBottom + 8;
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
  const pathname = usePathname();
  const [activeSectionId, setActiveSectionId] = useState<string | null>(items[0]?.id ?? null);
  const sectionNavigationRef = useRef<HTMLElement | null>(null);
  const initialSectionRef = useRef<{
    pathname: string | null;
    hash: string;
    restored: boolean;
  } | null>(null);

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
    if (initialSectionRef.current === null || initialSectionRef.current.pathname !== pathname) {
      initialSectionRef.current = { pathname, hash: window.location.hash, restored: false };
    }
    const initialSection = initialSectionRef.current;
    const hash = initialSection.hash;
    const sectionItem = items.find((item) => `#${item.id}` === hash);

    if (initialSection.restored || sectionItem === undefined || items.length < 2) {
      return;
    }
    const sectionId = sectionItem.id;
    const initialTargetId = sectionItem.initialTargetId ?? sectionId;

    let animationFrameId: number | null = null;
    const restoreInitialSection = () => {
      animationFrameId = null;

      if (window.location.hash !== hash) {
        observer.disconnect();
        return;
      }

      // Let the browser finish its native fragment scroll before correcting it.
      if (document.readyState !== "complete") {
        return;
      }

      const section = document.getElementById(initialTargetId);
      const navigation = sectionNavigationRef.current;
      // Streamed sections can still be absent or inside a hidden container.
      if (section === null || navigation === null || section.getClientRects().length === 0) {
        return;
      }

      const navigationTop = Number.parseFloat(window.getComputedStyle(navigation).top) || 0;
      // Reserve main-header space while route-entry positioning is settling.
      const offset = Math.max(navigationTop, HEADER_VISIBLE_OFFSET_PX) + navigation.offsetHeight;

      initialSection.restored = true;
      observer.disconnect();
      window.scrollTo({
        top: Math.max(window.scrollY + section.getBoundingClientRect().top - offset, 0),
        behavior: "instant",
      });
      setActiveSectionId(sectionId);
    };
    const scheduleRestore = () => {
      if (animationFrameId === null) {
        animationFrameId = window.requestAnimationFrame(restoreInitialSection);
      }
    };
    const observer = new MutationObserver(scheduleRestore);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden", "style"],
    });
    window.addEventListener("load", scheduleRestore, { once: true });
    scheduleRestore();

    return () => {
      observer.disconnect();
      window.removeEventListener("load", scheduleRestore);
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [items, pathname]);

  useEffect(() => {
    if (items.length < 2) {
      return;
    }

    let animationFrameId: number | null = null;

    const updateActiveSectionFromScroll = () => {
      const sectionElements = items
        .map((item) => document.getElementById(item.id))
        .filter((element): element is HTMLElement => element !== null);
      const stickyNavBottom = sectionNavigationRef.current?.getBoundingClientRect().bottom ?? 0;
      const pageHeight = document.documentElement.scrollHeight;
      const isAtPageBottom =
        pageHeight > window.innerHeight && window.scrollY + window.innerHeight >= pageHeight - 2;
      const lastSection = sectionElements.at(-1);
      const nextActiveSection =
        isAtPageBottom &&
        lastSection !== undefined &&
        lastSection.getBoundingClientRect().top < window.innerHeight
          ? lastSection.id
          : getActiveSectionIdFromViewport(sectionElements, stickyNavBottom);

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
    const headerOffsetObserver = new MutationObserver(scheduleActiveSectionUpdate);
    headerOffsetObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
    window.addEventListener("scroll", scheduleActiveSectionUpdate, { passive: true });
    window.addEventListener("resize", scheduleActiveSectionUpdate);

    return () => {
      headerOffsetObserver.disconnect();
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
      className={`sticky z-40 px-1 motion-reduce:transition-none ${className ?? ""}`}
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
                className={`${SECTION_NAV_LINK_CLASS_NAME} ${isActive ? ACTIVE_SECTION_NAV_LINK_CLASS_NAME : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
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
