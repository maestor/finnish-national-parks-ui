"use client";

import { type ComponentProps, useId } from "react";
import { cn } from "@/lib/cn";

export const LONG_TEXTAREA_MAX_LENGTH = 5000;

interface TextareaWithCounterProps extends Omit<ComponentProps<"textarea">, "onChange" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
}

export const TextareaWithCounter = ({
  value,
  onValueChange,
  id,
  maxLength = LONG_TEXTAREA_MAX_LENGTH,
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: TextareaWithCounterProps) => {
  const generatedId = useId();
  const currentLength = value.length;
  const isOverLimit = currentLength > maxLength;
  const counterId = `${id ?? generatedId}-character-count`;
  const describedBy = [ariaDescribedBy, counterId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      <textarea
        {...props}
        id={id}
        value={value}
        maxLength={maxLength}
        aria-describedby={describedBy}
        aria-invalid={ariaInvalid ?? (isOverLimit || undefined)}
        onChange={(event) => onValueChange(event.target.value.slice(0, maxLength))}
        className={cn(
          className,
          isOverLimit &&
            "border-destructive focus-visible:ring-destructive/40 dark:border-destructive",
        )}
      />
      <p
        id={counterId}
        className={cn(
          "text-right text-xs tabular-nums text-muted-foreground",
          isOverLimit && "text-destructive",
        )}
      >
        {currentLength} / {maxLength}
      </p>
    </div>
  );
};
