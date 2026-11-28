"use client";
import { ArrowUpRight, Check, Globe2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { PUBLIC_META_BADGE_CLASS_NAME } from "@/components/layout/public-page-styles";
import { DeferredMap } from "@/components/map/deferred-map";
import { LazyParkBoundaryMap } from "@/components/map/lazy-park-boundary-map";
import { ParkTrailChoices } from "@/components/map/park-trail-choices";
import { ParkLocationBadge } from "@/components/park/park-location-badge";
import { useParkTrailNavigation } from "@/components/park/park-trail-navigation";
import { useParkVisitVisibility } from "@/components/park/park-visit-link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectionDetails } from "@/components/ui/selection-details";
import { cn } from "@/lib/cn";
import { formatFinnishDate } from "@/lib/fi-date";
import { getParkLocationVisits } from "@/lib/park-location-visits";
import type { ParkDetail, Visit } from "@/lib/parks";
import { createParkVisitHref } from "@/lib/public-visits";

interface ParkLocationProps {
  boundaryGeoJson: NonNullable<ParkDetail["boundaryGeoJson"]>;
  boundingBox: ParkDetail["boundingBox"];
  markerPoint: ParkDetail["markerPoint"];
  parkName: string;
  parkSlug?: string;
  visits?: Visit[];
  linkedTrails: NonNullable<ParkDetail["linkedTrails"]>;
  linkedAreas?: NonNullable<ParkDetail["linkedAreas"]>;
  areaContent: ReactNode;
  areaActions?: ReactNode;
}
const EMPTY_AREAS: NonNullable<ParkDetail["linkedAreas"]> = [];

export const ParkLocation = ({
  areaContent,
  areaActions,
  linkedTrails,
  linkedAreas = EMPTY_AREAS,
  parkSlug = "",
  visits = [],
  ...mapProps
}: ParkLocationProps) => {
  const t = useTranslations("map");
  const parkT = useTranslations("park");
  const effectiveVisits = useParkVisitVisibility() ?? visits;
  const locationVisits = getParkLocationVisits([...linkedTrails, ...linkedAreas], effectiveVisits);
  const visitedSlugs = [...locationVisits]
    .filter(([, entries]) => entries.length > 0)
    .map(([slug]) => slug);
  const visitNumbers = new Map(
    [...effectiveVisits]
      .sort((a, b) => a.visitedOn.localeCompare(b.visitedOn))
      .map((visit, index) => [visit.id, index + 1]),
  );
  const navigation = useParkTrailNavigation();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [request, setRequest] = useState<{ slug: string | null; sequence: number } | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [status, setStatus] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLFieldSetElement>(null);
  const selected = linkedTrails.find((trail) => trail.slug === selectedSlug);
  const selectedArea = linkedAreas.find((area) => area.slug === selectedSlug);
  const selectedLocation = selected ?? selectedArea;
  const selectedName = selectedLocation?.name;
  const address = selectedLocation?.address;
  const officialUrl = selectedLocation?.parkUrl;
  const selectedVisits = selectedLocation ? (locationVisits.get(selectedLocation.slug) ?? []) : [];
  const chooserLabel = t("mapChooser");
  const mobileSelectionLabel = selected
    ? t("mapTrailChoice", { name: selected.name })
    : selectedArea
      ? t("mapAreaChoice", { name: selectedArea.name })
      : t("wholeArea");
  useEffect(() => {
    if (selectedSlug !== null && selectedName === undefined) {
      setSelectedSlug(null);
      setPreviewSlug(null);
      setRequest((previous) => ({ slug: null, sequence: (previous?.sequence ?? 0) + 1 }));
      setStatus(t("selectionStatus", { name: t("wholeArea") }));
    }
  }, [selectedName, selectedSlug, t]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => {
      if (media.matches) {
        setChooserOpen(false);
        if (chooserOpen) requestAnimationFrame(() => listRef.current?.focus());
      }
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [chooserOpen]);
  const select = useCallback(
    (slug: string | null) => {
      setSelectedSlug(slug);
      setRequest((previous) => ({ slug, sequence: (previous?.sequence ?? 0) + 1 }));
      setStatus(
        t("selectionStatus", {
          name:
            linkedTrails.find((trail) => trail.slug === slug)?.name ??
            linkedAreas.find((area) => area.slug === slug)?.name ??
            t("wholeArea"),
        }),
      );
    },
    [linkedTrails, linkedAreas, t],
  );
  const externalRequest = navigation?.request;
  useEffect(() => {
    if (externalRequest) select(externalRequest.slug);
  }, [externalRequest, select]);
  const selectAndClose = (slug: string | null) => {
    select(slug);
    setChooserOpen(false);
  };
  const choices = {
    trails: linkedTrails,
    visitedSlugs,
    areaLabel: t("wholeArea"),
    selectedSlug: selectedName === undefined ? null : selectedSlug,
    previewSlug,
    onSelect: select,
    onPreview: setPreviewSlug,
  };
  const groupedChoices = (onSelect: typeof select) => (
    <>
      {linkedAreas.length > 0 && (
        <div className="pt-2">
          <h3 className="px-2 text-sm font-semibold">
            {t("areaCount", { count: linkedAreas.length })}
          </h3>
          <ParkTrailChoices
            {...choices}
            trails={linkedAreas}
            kind="area"
            areaLabel={undefined}
            onSelect={onSelect}
          />
        </div>
      )}
      {linkedTrails.length > 0 && (
        <div className="pt-2">
          <h3 className="px-2 text-sm font-semibold">
            {t("trailCount", { count: linkedTrails.length })}
          </h3>
          <ParkTrailChoices {...choices} areaLabel={undefined} onSelect={onSelect} />
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="md:flex md:gap-4">
        <fieldset ref={listRef} tabIndex={-1} className="hidden w-60 shrink-0 md:block">
          <legend className="sr-only">{chooserLabel}</legend>
          <ParkTrailChoices {...choices} trails={[]} />
          <div className="max-h-87.5 overflow-y-auto">{groupedChoices(select)}</div>
        </fieldset>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          aria-haspopup="dialog"
          aria-label={`${chooserLabel}: ${mobileSelectionLabel}`}
          className="mb-3 h-auto min-h-11 w-full justify-between whitespace-normal text-left md:hidden"
          onClick={() => setChooserOpen(true)}
        >
          {mobileSelectionLabel}
        </Button>
        <DeferredMap
          className="h-87.5 min-w-0 flex-1 md:h-107.5"
          label={t("boundaryAriaLabel", { parkName: mapProps.parkName })}
        >
          <LazyParkBoundaryMap
            {...mapProps}
            linkedTrails={linkedTrails}
            linkedAreas={linkedAreas}
            visitedSlugs={visitedSlugs}
            selectedSlug={choices.selectedSlug}
            previewSlug={previewSlug}
            cameraRequest={request}
            onPreview={setPreviewSlug}
            onPick={select}
            onReset={() => select(null)}
          />
        </DeferredMap>
      </div>
      <Dialog
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        title={chooserLabel}
        closeLabel={t("closeMapChooser")}
        className="mt-auto w-full rounded-b-none md:w-[min(92vw,32rem)]"
      >
        <div className="flex min-h-0 flex-col p-5">
          <ParkTrailChoices {...choices} trails={[]} onSelect={selectAndClose} />
          <div className="min-h-0 overflow-y-auto">{groupedChoices(selectAndClose)}</div>
        </div>
      </Dialog>
      <span className="sr-only" role="status">
        {status}
      </span>
      <SelectionDetails
        label={selected ? t("selectedTrail") : selectedArea ? t("selectedArea") : t("wholeArea")}
        labelAction={
          !!officialUrl && (
            <a
              href={officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${t("officialLink")} (${parkT("opensInNewTab")})`}
              className={cn(
                PUBLIC_META_BADGE_CLASS_NAME,
                "relative shrink-0 text-link transition-colors after:absolute after:inset-x-0 after:-inset-y-2.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              <Globe2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t("officialLink")}
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          )
        }
        actions={selectedName === undefined ? areaActions : null}
      >
        {selectedLocation ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ParkLocationBadge kind={selected ? "trail" : "area"}>
                <span className="min-w-0 wrap-break-word">{selectedLocation.name}</span>
                {selectedVisits.length > 0 && (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">{t("visitedLocation")}</span>
                  </>
                )}
                {selected?.lengthKm != null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="shrink-0">{selected.lengthKm.toLocaleString("fi-FI")} km</span>
                  </>
                )}
              </ParkLocationBadge>
              {!!address && (
                <ParkLocationBadge kind="address">
                  <span className="min-w-0 wrap-break-word">{address}</span>
                </ParkLocationBadge>
              )}
            </div>
            {selectedVisits.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-x-1 text-sm">
                <span>{t("linkedVisitCount", { count: selectedVisits.length })}:</span>
                {selectedVisits.map((visit, index) => (
                  <span key={visit.id}>
                    <Link
                      href={createParkVisitHref({ parkSlug, visitId: visit.id })}
                      prefetch={false}
                      scroll={false}
                      aria-label={
                        selectedVisits.filter((item) => item.visitedOn === visit.visitedOn).length >
                        1
                          ? `${formatFinnishDate(visit.visitedOn)}, ${parkT("visitNumber", { number: visitNumbers.get(visit.id) ?? 0 })}`
                          : undefined
                      }
                      className="inline-flex min-h-11 items-center text-link underline underline-offset-2"
                      onClick={(event) => {
                        if (
                          !event.metaKey &&
                          !event.ctrlKey &&
                          !event.shiftKey &&
                          !event.altKey &&
                          event.button === 0
                        )
                          window.dispatchEvent(
                            new CustomEvent("park-visit-navigation", { detail: visit.id }),
                          );
                      }}
                    >
                      {formatFinnishDate(visit.visitedOn)}
                    </Link>
                    {index < selectedVisits.length - 1 ? "," : ""}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          areaContent
        )}
      </SelectionDetails>
    </>
  );
};
