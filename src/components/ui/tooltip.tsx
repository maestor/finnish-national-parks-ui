"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

interface TooltipRenderProps {
  isOpen: boolean;
  tooltipId: string;
}

interface TooltipProps {
  children: (props: TooltipRenderProps) => ReactNode;
  content: string;
  live?: "polite" | "assertive";
  open?: boolean;
  role?: "status" | "tooltip";
  side?: "bottom" | "left" | "right" | "top";
  suppressInteractionAfterOpen?: boolean;
  tone?: "default" | "success";
}

const toneClassNames = {
  default:
    "border-white/55 bg-white/94 text-popover-foreground shadow-[0_16px_32px_rgba(148,163,184,0.22)] dark:border-white/10 dark:bg-slate-950/94 dark:text-popover-foreground dark:shadow-[0_18px_36px_rgba(2,6,23,0.36)]",
  success:
    "border-emerald-300/70 bg-emerald-50/96 text-emerald-900 shadow-[0_10px_24px_rgba(5,150,105,0.18)] dark:border-emerald-300/20 dark:bg-emerald-950/92 dark:text-emerald-100",
} as const;

interface TooltipPosition {
  left: number;
  top: number;
  resolvedSide: "bottom" | "left" | "right" | "top";
}

const tooltipOffsetPx = 12;
const viewportPaddingPx = 8;

interface TooltipRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface ResolveTooltipPositionOptions {
  preferredSide: "bottom" | "left" | "right" | "top";
  tooltipHeight: number;
  tooltipWidth: number;
  triggerRect: TooltipRect;
  viewportHeight: number;
  viewportWidth: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const canPlaceOnSide = (
  side: "bottom" | "left" | "right" | "top",
  triggerRect: TooltipRect,
  tooltipWidth: number,
  tooltipHeight: number,
  viewportWidth: number,
  viewportHeight: number,
) => {
  if (side === "top") {
    return triggerRect.top - tooltipOffsetPx - tooltipHeight >= viewportPaddingPx;
  }

  if (side === "bottom") {
    return (
      triggerRect.top + triggerRect.height + tooltipOffsetPx + tooltipHeight <=
      viewportHeight - viewportPaddingPx
    );
  }

  if (side === "left") {
    return triggerRect.left - tooltipOffsetPx - tooltipWidth >= viewportPaddingPx;
  }

  return (
    triggerRect.left + triggerRect.width + tooltipOffsetPx + tooltipWidth <=
    viewportWidth - viewportPaddingPx
  );
};

const getFallbackSides = (preferredSide: "bottom" | "left" | "right" | "top") => {
  if (preferredSide === "top") {
    return ["bottom", "right", "left"] as const;
  }

  if (preferredSide === "bottom") {
    return ["top", "right", "left"] as const;
  }

  if (preferredSide === "left") {
    return ["right", "top", "bottom"] as const;
  }

  return ["left", "top", "bottom"] as const;
};

export const resolveTooltipPosition = ({
  preferredSide,
  tooltipHeight,
  tooltipWidth,
  triggerRect,
  viewportHeight,
  viewportWidth,
}: ResolveTooltipPositionOptions): TooltipPosition => {
  const resolvedSide =
    [preferredSide, ...getFallbackSides(preferredSide)].find((side) =>
      canPlaceOnSide(side, triggerRect, tooltipWidth, tooltipHeight, viewportWidth, viewportHeight),
    ) ?? preferredSide;

  if (resolvedSide === "top") {
    return {
      left: clamp(
        triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2,
        viewportPaddingPx,
        viewportWidth - tooltipWidth - viewportPaddingPx,
      ),
      top: Math.max(triggerRect.top - tooltipHeight - tooltipOffsetPx, viewportPaddingPx),
      resolvedSide,
    };
  }

  if (resolvedSide === "bottom") {
    return {
      left: clamp(
        triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2,
        viewportPaddingPx,
        viewportWidth - tooltipWidth - viewportPaddingPx,
      ),
      top: Math.min(
        triggerRect.top + triggerRect.height + tooltipOffsetPx,
        viewportHeight - tooltipHeight - viewportPaddingPx,
      ),
      resolvedSide,
    };
  }

  if (resolvedSide === "left") {
    return {
      left: Math.max(triggerRect.left - tooltipWidth - tooltipOffsetPx, viewportPaddingPx),
      top: clamp(
        triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2,
        viewportPaddingPx,
        viewportHeight - tooltipHeight - viewportPaddingPx,
      ),
      resolvedSide,
    };
  }

  return {
    left: Math.min(
      triggerRect.left + triggerRect.width + tooltipOffsetPx,
      viewportWidth - tooltipWidth - viewportPaddingPx,
    ),
    top: clamp(
      triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2,
      viewportPaddingPx,
      viewportHeight - tooltipHeight - viewportPaddingPx,
    ),
    resolvedSide,
  };
};

export const Tooltip = ({
  children,
  content,
  live,
  open = false,
  role = "tooltip",
  side = "top",
  suppressInteractionAfterOpen = false,
  tone = "default",
}: TooltipProps) => {
  const generatedId = useId();
  const tooltipId = generatedId.replace(/:/g, "");
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const previousOpenRef = useRef(open);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusedWithin, setIsFocusedWithin] = useState(false);
  const [isInteractionSuppressed, setIsInteractionSuppressed] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  useEffect(() => {
    if (suppressInteractionAfterOpen && open) {
      setIsInteractionSuppressed(true);
    }

    if (suppressInteractionAfterOpen && previousOpenRef.current && !open) {
      setIsHovered(false);
      setIsFocusedWithin(false);
    }

    previousOpenRef.current = open;
  }, [open, suppressInteractionAfterOpen]);

  useEffect(() => {
    const clearTransientInteractionState = () => {
      setIsHovered(false);
      setIsFocusedWithin(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearTransientInteractionState();
      }
    };

    window.addEventListener("blur", clearTransientInteractionState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", clearTransientInteractionState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const isOpen = open || (!isInteractionSuppressed && (isHovered || isFocusedWithin));
  const canRenderPortal = typeof document !== "undefined";

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect();

      if (!rect || !tooltipRect) {
        return;
      }

      setPosition(
        resolveTooltipPosition({
          preferredSide: side,
          tooltipHeight: tooltipRect.height,
          tooltipWidth: tooltipRect.width,
          triggerRect: rect,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        }),
      );
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, side]);

  return (
    <span
      ref={rootRef}
      className="relative inline-flex shrink-0 items-center"
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => {
        setIsHovered(false);
        setIsInteractionSuppressed(false);
      }}
      onFocusCapture={() => setIsFocusedWithin(true)}
      onBlurCapture={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }

        setIsFocusedWithin(false);

        if (event.relatedTarget instanceof Node) {
          setIsInteractionSuppressed(false);
        }
      }}
    >
      {children({ isOpen, tooltipId })}
      {!!isOpen &&
        canRenderPortal &&
        createPortal(
          <span
            ref={tooltipRef}
            id={tooltipId}
            role={role}
            aria-live={live}
            data-side={position?.resolvedSide ?? side}
            className={cn(
              "pointer-events-none fixed z-[500] w-max max-w-[min(calc(100vw-1rem),20rem)] whitespace-normal break-words rounded-xl border px-3 py-1.5 text-center text-xs leading-tight font-medium backdrop-blur-sm",
              toneClassNames[tone],
            )}
            style={{
              left: position?.left ?? 0,
              top: position?.top ?? 0,
              visibility: position ? "visible" : "hidden",
            }}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
};
