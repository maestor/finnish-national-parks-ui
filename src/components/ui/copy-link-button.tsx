"use client";

import { Check, Link2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";

interface CopyLinkButtonProps {
  className?: string;
  copiedLabel: string;
  href: string;
  iconClassName?: string;
  label: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  tooltipSide?: "bottom" | "left" | "right" | "top";
}

const resetDelayMs = 2000;

const resolveAbsoluteHref = (href: string) => new URL(href, window.location.origin).toString();

const writeTextToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "absolute";
  textArea.style.left = "-9999px";
  document.body.append(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
};

export const CopyLinkButton = ({
  className = "inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
  copiedLabel,
  href,
  iconClassName = "h-3.5 w-3.5",
  label,
  onClick,
  tooltipSide = "top",
}: CopyLinkButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    try {
      await writeTextToClipboard(resolveAbsoluteHref(href));
      setIsCopied(true);

      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }

      resetTimeoutRef.current = window.setTimeout(() => {
        setIsCopied(false);
        resetTimeoutRef.current = null;
      }, resetDelayMs);
    } catch {
      setIsCopied(false);
    }
  };

  const Icon = isCopied ? Check : Link2;
  const tooltipContent = isCopied ? copiedLabel : label;

  return (
    <Tooltip
      content={tooltipContent}
      live={isCopied ? "polite" : undefined}
      open={isCopied}
      role={isCopied ? "status" : "tooltip"}
      side={tooltipSide}
      suppressInteractionAfterOpen
      tone={isCopied ? "success" : "default"}
    >
      {({ isOpen, tooltipId }) => (
        <button
          type="button"
          className={className}
          aria-label={label}
          aria-describedby={isOpen ? tooltipId : undefined}
          onClick={(event) => {
            void handleClick(event);
          }}
        >
          <Icon className={iconClassName} aria-hidden="true" />
        </button>
      )}
    </Tooltip>
  );
};
