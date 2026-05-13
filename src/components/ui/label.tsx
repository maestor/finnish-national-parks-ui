import { cn } from "@/lib/cn";
import type { LabelHTMLAttributes } from "react";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = ({ className, children, required, ...props }: LabelProps) => {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: reusable label component; consumers provide htmlFor
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
      {required && <span aria-hidden="true"> *</span>}
    </label>
  );
};
