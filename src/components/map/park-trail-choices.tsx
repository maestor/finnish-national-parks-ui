"use client";
import { Check, Map as MapIcon, Route } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ParkDetail } from "@/lib/parks";

type Trail = NonNullable<ParkDetail["linkedTrails"]>[number];
interface Props {
  trails: Trail[];
  visitedSlugs?: string[];
  areaLabel?: string;
  selectedSlug: string | null;
  previewSlug: string | null;
  onSelect: (slug: string | null) => void;
  onPreview: (slug: string | null) => void;
}
export const ParkTrailChoices = ({
  trails,
  visitedSlugs = [],
  areaLabel,
  selectedSlug,
  previewSlug,
  onSelect,
  onPreview,
}: Props) => {
  const t = useTranslations("map");
  return (
    <div>
      {[...(areaLabel ? [{ slug: null, name: areaLabel }] : []), ...trails].map((trail) => (
        <Button
          key={trail.slug ?? "area"}
          variant="ghost"
          type="button"
          aria-pressed={selectedSlug === trail.slug}
          className={cn(
            "h-auto min-h-11 w-full justify-start whitespace-normal px-2 text-left",
            previewSlug === trail.slug && trail.slug !== null && "bg-accent",
            selectedSlug === trail.slug &&
              "bg-accent text-accent-foreground ring-1 ring-inset ring-ring",
          )}
          onClick={() => onSelect(trail.slug)}
          onMouseEnter={() => onPreview(trail.slug)}
          onMouseLeave={() => onPreview(null)}
          onFocus={() => onPreview(trail.slug)}
          onBlur={() => onPreview(null)}
        >
          {trail.slug === null ? (
            <MapIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Route className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="min-w-0 flex-1 wrap-anywhere">{trail.name}</span>
          {trail.slug !== null && visitedSlugs.includes(trail.slug) && (
            <>
              {" "}
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="sr-only">{t("visitedTrail")}</span>
            </>
          )}
        </Button>
      ))}
    </div>
  );
};
