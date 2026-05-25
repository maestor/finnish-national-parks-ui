import { AppIconArtwork } from "@/lib/app-icon-artwork";
import { cn } from "@/lib/cn";
import type { ReactElement } from "react";

type HeaderBrandMarkProps = {
  className?: string;
  testId?: string;
};

export const HeaderBrandMark = ({ className, testId }: HeaderBrandMarkProps): ReactElement => {
  return (
    <span
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-[0_10px_24px_rgba(15,23,42,0.18)] ring-1 ring-black/5",
        className,
      )}
    >
      <AppIconArtwork testId={testId} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,transparent_42%)]"
      />
    </span>
  );
};
