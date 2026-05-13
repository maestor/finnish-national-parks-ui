import type { Park } from "@/lib/parks";
import { getParkTypeColor } from "@/lib/parks";
import { ExternalLink, MapPin, Mountain } from "lucide-react";

interface ParkPopupProps {
  park: Park;
}

export const ParkPopup = ({ park }: ParkPopupProps) => {
  const typeColor = getParkTypeColor(park.type.slug);

  return (
    <article className="p-3 max-w-[260px]">
      <header className="flex items-start gap-2">
        <MapPin
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ color: typeColor }}
          aria-hidden="true"
        />
        <h3 className="font-semibold text-sm leading-tight">{park.name}</h3>
      </header>

      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Mountain className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{park.type.name}</span>
        </p>

        {park.locationLabel && (
          <p className="truncate" title={park.locationLabel}>
            {park.locationLabel}
          </p>
        )}

        {park.areaKm2 !== null && <p>{park.areaKm2} km²</p>}

        {park.establishmentYear !== null && <p>Perustettu {park.establishmentYear}</p>}
      </div>

      {park.luontoonUrl && (
        <a
          href={park.luontoonUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Luontoon.fi
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      )}
    </article>
  );
};
