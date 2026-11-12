"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  description?: string;
  className?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  dismissible?: boolean;
}

export const Dialog = ({
  open,
  onClose,
  title,
  closeLabel,
  description,
  className,
  children,
  dismissible = true,
}: DialogProps) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    closeRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      openerRef.current?.focus();
    };
  }, [open]);
  const close = () => {
    if (!dismissible) return;
    if (dialogRef.current?.open) dialogRef.current.close();
    onClose();
    openerRef.current?.focus();
  };
  if (!open) return null;
  const content = typeof children === "function" ? children(close) : children;
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cn(
        "m-auto max-h-[min(90dvh,48rem)] rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-hero/60",
        className,
      )}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="flex max-h-[min(90dvh,48rem)] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {Boolean(description) && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <Button
            ref={closeRef}
            variant="ghost"
            size="icon"
            type="button"
            onClick={close}
            disabled={!dismissible}
            aria-label={closeLabel}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        {content}
      </div>
    </dialog>,
    document.body,
  );
};
