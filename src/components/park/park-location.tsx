"use client";
import { Check } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { DeferredMap } from "@/components/map/deferred-map";
import { LazyParkBoundaryMap } from "@/components/map/lazy-park-boundary-map";
import { ParkTrailChoices } from "@/components/map/park-trail-choices";
import { ParkLocationBadge } from "@/components/park/park-location-badge";
import { useParkTrailNavigation } from "@/components/park/park-trail-navigation";
import { useParkVisitVisibility } from "@/components/park/park-visit-link";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectionDetails } from "@/components/ui/selection-details";
import { formatFinnishDate } from "@/lib/fi-date";
import { getParkTrailVisits } from "@/lib/park-trail-visits";
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
  areaContent: ReactNode;
  areaActions?: ReactNode;
}
export const ParkLocation = ({
  areaContent,
  areaActions,
  linkedTrails,
  parkSlug = "",
  visits = [],
  ...mapProps
}: ParkLocationProps) => {
  const t = useTranslations("map");
  const parkT = useTranslations("park");
  const effectiveVisits = useParkVisitVisibility() ?? visits;
  const trailVisits = getParkTrailVisits(linkedTrails, effectiveVisits);
  const visitedSlugs = [...trailVisits]
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
  useEffect(() => {
    if (selectedSlug !== null && !linkedTrails.some((trail) => trail.slug === selectedSlug)) {
      setSelectedSlug(null);
      setPreviewSlug(null);
      setRequest((previous) => ({ slug: null, sequence: (previous?.sequence ?? 0) + 1 }));
      setStatus(t("selectionStatus", { name: t("wholeArea") }));
    }
  }, [linkedTrails, selectedSlug, t]);
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
          name: linkedTrails.find((trail) => trail.slug === slug)?.name ?? t("wholeArea"),
        }),
      );
    },
    [linkedTrails, t],
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
    selectedSlug: selected?.slug ?? null,
    previewSlug,
    onSelect: select,
    onPreview: setPreviewSlug,
  };
  return (
    <>
      <div className="md:flex md:gap-4">
        <fieldset ref={listRef} tabIndex={-1} className="hidden w-60 shrink-0 md:block">
          <legend className="mb-2 font-semibold">
            {t("trailCount", { count: linkedTrails.length })}
          </legend>
          <ParkTrailChoices {...choices} trails={[]} />
          <div className="max-h-87.5 overflow-y-auto">
            <ParkTrailChoices {...choices} areaLabel={undefined} />
          </div>
        </fieldset>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          className="mb-3 h-auto min-h-11 w-full justify-between whitespace-normal text-left md:hidden"
          onClick={() => setChooserOpen(true)}
        >
          {t("trailCount", { count: linkedTrails.length })}: {selected?.name ?? t("wholeArea")}
        </Button>
        <DeferredMap
          className="h-87.5 min-w-0 flex-1 md:h-107.5"
          label={t("boundaryAriaLabel", { parkName: mapProps.parkName })}
        >
          <LazyParkBoundaryMap
            {...mapProps}
            linkedTrails={linkedTrails}
            visitedSlugs={visitedSlugs}
            selectedSlug={selected?.slug ?? null}
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
        title={t("trailCount", { count: linkedTrails.length })}
        closeLabel={t("closeChooser")}
        className="mt-auto w-full rounded-b-none md:w-[min(92vw,32rem)]"
      >
        <div className="flex min-h-0 flex-col p-5">
          <ParkTrailChoices {...choices} trails={[]} onSelect={selectAndClose} />
          <div className="min-h-0 overflow-y-auto">
            <ParkTrailChoices {...choices} areaLabel={undefined} onSelect={selectAndClose} />
          </div>
        </div>
      </Dialog>
      <span className="sr-only" role="status">
        {status}
      </span>
      <SelectionDetails
        label={selected ? t("selectedTrail") : t("wholeArea")}
        actions={selected ? null : areaActions}
      >
        {selected ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ParkLocationBadge kind="trail">
                <span className="min-w-0 wrap-break-word">{selected.name}</span>
                {visitedSlugs.includes(selected.slug) && (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">{t("visitedTrail")}</span>
                  </>
                )}
                {selected.lengthKm !== null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="shrink-0">{selected.lengthKm.toLocaleString("fi-FI")} km</span>
                  </>
                )}
              </ParkLocationBadge>
              {selected.address !== null && (
                <ParkLocationBadge kind="address">
                  <span className="min-w-0 wrap-break-word">{selected.address}</span>
                </ParkLocationBadge>
              )}
            </div>
            {(trailVisits.get(selected.slug) ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-x-1 text-sm">
                <span>
                  {t("linkedVisitCount", { count: trailVisits.get(selected.slug)?.length ?? 0 })}:
                </span>
                {trailVisits.get(selected.slug)?.map((visit, index) => (
                  <span key={visit.id}>
                    <Link
                      href={createParkVisitHref({ parkSlug, visitId: visit.id })}
                      prefetch={false}
                      scroll={false}
                      aria-label={
                        (trailVisits.get(selected.slug) ?? []).filter(
                          (item) => item.visitedOn === visit.visitedOn,
                        ).length > 1
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
                    {index < (trailVisits.get(selected.slug)?.length ?? 0) - 1 ? "," : ""}
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
