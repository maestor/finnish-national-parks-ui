"use client";

import {
  CalendarRange,
  Camera,
  ChevronDown,
  FileText,
  Images,
  Route,
  Signpost,
  TentTree,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EditIconLink } from "@/components/admin/edit-icon-link";
import {
  PUBLIC_EYEBROW_BADGE_CLASS_NAME,
  PUBLIC_HERO_DESCRIPTION_CLASS_NAME,
  PUBLIC_HERO_HEADING_STACK_CLASS_NAME,
  PUBLIC_HERO_TITLE_CLASS_NAME,
  PUBLIC_PAGE_SHELL_CLASS_NAME,
  PUBLIC_PANEL_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { VisitImageGallery } from "@/components/visits/visit-image-gallery";
import { useAuth } from "@/hooks/use-auth";
import { apiPublicFetch } from "@/lib/api";
import { formatFinnishDate, formatFinnishDateRange } from "@/lib/fi-date";
import type { PublicTripVisitDetailsResponse } from "@/lib/public-trip-visit-details";
import { tripVisitHasExpandableDetails } from "@/lib/public-trip-visit-details";
import { createParkVisitHref } from "@/lib/public-visits";
import { appRoutes } from "@/lib/routes";
import type { PublicTripDetail } from "@/lib/trips";
import { LazyPublicTripMap } from "./lazy-public-trip-map";

interface PublicTripPageProps {
  trip: PublicTripDetail;
}

const META_PILL_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-full border border-slate-300/75 bg-white/78 px-3 py-1 text-xs font-medium text-foreground/80 shadow-[0_1px_2px_rgba(148,163,184,0.12),inset_0_1px_0_rgba(255,255,255,0.48)] dark:border-white/10 dark:bg-slate-950/56 dark:text-sky-100/72 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";
const ROUTE_BADGE_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-[linear-gradient(145deg,rgba(22,101,52,0.12),rgba(16,185,129,0.18))] px-2.5 py-1 text-sm leading-none font-semibold text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-emerald-300/15 dark:bg-[linear-gradient(145deg,rgba(22,101,52,0.24),rgba(16,185,129,0.16))] dark:text-emerald-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";
const IMAGE_BADGE_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-full border border-sky-200/70 bg-[linear-gradient(145deg,rgba(22,101,52,0.08),rgba(37,99,235,0.12))] px-2.5 py-1 text-sm leading-none font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-sky-300/15 dark:bg-[linear-gradient(145deg,rgba(22,101,52,0.18),rgba(37,99,235,0.16))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";
const ITINERARY_NUMBER_BADGE_CLASS_NAME =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-sky-200/75 bg-white/88 px-2 text-sm font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.56)] dark:border-sky-300/15 dark:bg-slate-950/58";
const HERO_ICON_BUTTON_CLASS_NAME =
  "inline-flex items-center justify-center rounded-full border border-white/45 bg-white/76 p-2 text-foreground/72 shadow-[0_8px_20px_rgba(148,163,184,0.18)] backdrop-blur-sm transition-colors hover:bg-white/92 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/56 dark:text-sky-100/72 dark:shadow-[0_12px_24px_rgba(2,6,23,0.24)] dark:hover:bg-slate-950/72";
const DETAIL_SECTION_HEADING_CLASS_NAME =
  "flex items-center gap-2 border-b border-white/35 pb-2 text-base font-semibold dark:border-white/10";
const VISIT_TOGGLE_BUTTON_CLASS_NAME =
  "inline-flex items-center gap-2 rounded-full border border-sky-200/70 bg-white/76 px-3 py-1.5 text-xs font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition-colors hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-sky-300/15 dark:bg-slate-950/56 dark:hover:bg-slate-950/72";
const VISIT_CARD_CLASS_NAME =
  "overflow-hidden rounded-3xl border border-emerald-200/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.82),rgba(236,253,245,0.92))] shadow-[0_16px_34px_rgba(34,197,94,0.12),0_10px_24px_rgba(148,163,184,0.12)] dark:border-emerald-300/15 dark:bg-[linear-gradient(160deg,rgba(15,23,42,0.78),rgba(6,78,59,0.22))] dark:shadow-[0_20px_38px_rgba(2,6,23,0.28)]";
const VISIT_KIND_BADGE_CLASS_NAME =
  "inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-1 text-xs font-semibold tracking-wide text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200";
const STOP_KIND_BADGE_CLASS_NAME =
  "inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-1 text-xs font-semibold tracking-wide text-amber-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200";

const ROUTE_KM_FORMATTER = new Intl.NumberFormat("fi-FI", {
  maximumFractionDigits: 0,
});
const TRIP_VISIT_DETAILS_LOAD_DELAY_MS = 150;

const getTripVisitDetailsPath = (slug: string) => `/api/trips/slug/${slug}/visit-details`;

const getVisitDetailsPanelId = (visitId: number) => `trip-visit-details-${visitId}`;

export const PublicTripPage = ({ trip }: PublicTripPageProps) => {
  const t = useTranslations("tripPage");
  const auth = useAuth();
  const routeStatus = trip.route;
  const route = routeStatus.data;
  const startingPoint = trip.startingPoint;
  const shouldShowEditTripLink = auth.isAuthenticated === true;
  const shouldShowStopCount = trip.stopCount > 0;
  const shouldShowImageCount = trip.imageCount > 0;
  const shouldShowRouteContent = routeStatus.success && route !== null;
  const shouldShowRouteMap =
    startingPoint !== null &&
    (trip.itinerary.length > 0 || routeStatus.success === false || shouldShowRouteContent);
  const shouldShowRouteSection = shouldShowRouteContent || shouldShowRouteMap;
  const hasDeferredVisitDetails = trip.itinerary.some(
    (item) => item.kind === "visit" && item.visit.imageCount > 0,
  );
  const [openVisitId, setOpenVisitId] = useState<number | null>(null);
  const [visitDetailsById, setVisitDetailsById] = useState<
    PublicTripVisitDetailsResponse["visits"]
  >({});
  const [visitDetailsStatus, setVisitDetailsStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >(hasDeferredVisitDetails ? "idle" : "ready");
  const [, startVisitDetailsTransition] = useTransition();
  const visitCardRefs = useRef(new Map<number, HTMLLIElement>());
  const visitToggleButtonRefs = useRef(new Map<number, HTMLButtonElement>());
  const pendingScrollVisitIdRef = useRef<number | null>(null);

  const loadVisitDetails = useEffectEvent(async () => {
    if (hasDeferredVisitDetails === false || visitDetailsStatus === "loading") {
      return;
    }

    if (visitDetailsStatus === "ready" && Object.keys(visitDetailsById).length > 0) {
      return;
    }

    setVisitDetailsStatus("loading");

    try {
      const response = await apiPublicFetch<PublicTripVisitDetailsResponse>(
        getTripVisitDetailsPath(trip.slug),
      );

      startVisitDetailsTransition(() => {
        setVisitDetailsById(response.visits);
        setVisitDetailsStatus("ready");
      });
    } catch {
      setVisitDetailsStatus("error");
    }
  });

  useEffect(() => {
    if (hasDeferredVisitDetails === false) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadVisitDetails();
    }, TRIP_VISIT_DETAILS_LOAD_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasDeferredVisitDetails]);

  useEffect(() => {
    const pendingScrollVisitId = pendingScrollVisitIdRef.current;

    if (pendingScrollVisitId === null) {
      return;
    }

    const visitCard = visitCardRefs.current.get(pendingScrollVisitId);
    const toggleButton = visitToggleButtonRefs.current.get(pendingScrollVisitId);

    visitCard?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    toggleButton?.focus({
      preventScroll: true,
    });
    pendingScrollVisitIdRef.current = null;
  });

  const ensureVisitDetailsLoaded = () => {
    if (hasDeferredVisitDetails === true) {
      void loadVisitDetails();
    }
  };

  const openVisitFromMap = (visitId: number) => {
    ensureVisitDetailsLoaded();

    if (openVisitId === visitId) {
      const visitCard = visitCardRefs.current.get(visitId);
      const toggleButton = visitToggleButtonRefs.current.get(visitId);

      visitCard?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      toggleButton?.focus({
        preventScroll: true,
      });
      return;
    }

    pendingScrollVisitIdRef.current = visitId;
    setOpenVisitId(visitId);
  };

  const toggleVisit = (visitId: number) => {
    ensureVisitDetailsLoaded();
    setOpenVisitId((currentOpenVisitId) => (currentOpenVisitId === visitId ? null : visitId));
  };

  return (
    <div className={PUBLIC_PAGE_SHELL_CLASS_NAME}>
      <section className={PUBLIC_PANEL_CLASS_NAME}>
        <div className={PUBLIC_HERO_HEADING_STACK_CLASS_NAME}>
          <div className={PUBLIC_EYEBROW_BADGE_CLASS_NAME}>
            <TentTree className="h-4 w-4" aria-hidden="true" />
            <span>{t("eyebrow")}</span>
          </div>
          <h1 className={PUBLIC_HERO_TITLE_CLASS_NAME}>{trip.name}</h1>
          {trip.dateRange !== null && (
            <p className="text-sm font-medium text-primary">
              {formatFinnishDateRange(trip.dateRange.start, trip.dateRange.end)}
            </p>
          )}
          {trip.description !== null && (
            <p
              className={`mt-3 whitespace-pre-line ${PUBLIC_HERO_DESCRIPTION_CLASS_NAME} max-w-none!`}
            >
              {trip.description}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className={META_PILL_CLASS_NAME}>
            <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
            {trip.visitCount} {t("visitCount", { count: trip.visitCount })}
          </span>
          {shouldShowStopCount === true && (
            <span className={META_PILL_CLASS_NAME}>
              <Signpost className="h-3.5 w-3.5" aria-hidden="true" />
              {trip.stopCount} {t("stopCount", { count: trip.stopCount })}
            </span>
          )}
          {shouldShowImageCount === true && (
            <span className={META_PILL_CLASS_NAME}>
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              {trip.imageCount} {t("imageCount", { count: trip.imageCount })}
            </span>
          )}
          <CopyLinkButton
            href={appRoutes.trip(trip.slug)}
            label={t("copyTripPageLink")}
            copiedLabel={t("tripPageLinkCopied")}
            tooltipSide="top"
            className={HERO_ICON_BUTTON_CLASS_NAME}
            iconClassName="h-3.5 w-3.5"
          />
          {shouldShowEditTripLink === true && (
            <EditIconLink
              href={appRoutes.controlPanel.editTrip(trip.id)}
              label={t("editTrip")}
              className={HERO_ICON_BUTTON_CLASS_NAME}
              iconClassName="h-3.5 w-3.5"
            />
          )}
        </div>
      </section>

      {shouldShowRouteSection === true && (
        <section className={PUBLIC_PANEL_CLASS_NAME} aria-labelledby="trip-route-title">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 id="trip-route-title" className="text-lg font-semibold tracking-tight">
              {t("routeTitle")}
            </h2>
          </div>
          {shouldShowRouteMap === true && (
            <div className="mt-4">
              <LazyPublicTripMap
                onVisitAction={openVisitFromMap}
                route={route}
                startingPoint={startingPoint}
                tripName={trip.name}
                tripStops={trip.itinerary}
              />
            </div>
          )}
          {shouldShowRouteContent === true && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={META_PILL_CLASS_NAME}>
                <Route className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t("routeDistanceLabel")}</span>
                {t("routeDistanceValue", {
                  kilometers: ROUTE_KM_FORMATTER.format(route.distanceMeters / 1000),
                })}
              </span>
            </div>
          )}
        </section>
      )}

      <section className={PUBLIC_PANEL_CLASS_NAME} aria-labelledby="trip-itinerary-title">
        <div className="flex items-center gap-2">
          <Signpost className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 id="trip-itinerary-title" className="text-lg font-semibold tracking-tight">
            {t("itineraryTitle")}
          </h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("itineraryDescription")}</p>

        <ol aria-label={t("itineraryTitle")} className="mt-5 space-y-4">
          {trip.itinerary.map((item) =>
            item.kind === "visit" ? (
              (() => {
                const isOpen = openVisitId === item.visit.id;
                const visitHasExpandableDetails = tripVisitHasExpandableDetails(item.visit);
                const visitDetails = visitDetailsById[String(item.visit.id)];
                const images = visitDetails?.images ?? [];
                const shouldShowImageLoadingState =
                  item.visit.imageCount > 0 &&
                  images.length === 0 &&
                  visitDetailsStatus !== "error" &&
                  visitDetailsStatus !== "ready";
                const shouldShowImageErrorState =
                  item.visit.imageCount > 0 &&
                  images.length === 0 &&
                  visitDetailsStatus === "error";

                return (
                  <li
                    key={`visit-${item.visit.id}`}
                    ref={(node) => {
                      if (node) {
                        visitCardRefs.current.set(item.visit.id, node);
                        return;
                      }

                      visitCardRefs.current.delete(item.visit.id);
                    }}
                    className={VISIT_CARD_CLASS_NAME}
                  >
                    <div className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className={ITINERARY_NUMBER_BADGE_CLASS_NAME}>
                          {item.tripStopOrder}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-primary">
                                {formatFinnishDate(item.visit.visitedOn)}
                              </p>
                              <div className="mt-2">
                                <span className={VISIT_KIND_BADGE_CLASS_NAME}>
                                  {t("visitLabel")}
                                </span>
                              </div>
                              <h3 className="mt-2 text-lg font-semibold tracking-tight">
                                <Link
                                  href={createParkVisitHref({
                                    parkSlug: item.visit.park.slug,
                                    visitId: item.visit.id,
                                  })}
                                  className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  {item.visit.park.name}
                                </Link>
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.visit.park.typeLabel}
                              </p>
                            </div>
                            {visitHasExpandableDetails === true && (
                              <button
                                ref={(node) => {
                                  if (node) {
                                    visitToggleButtonRefs.current.set(item.visit.id, node);
                                    return;
                                  }

                                  visitToggleButtonRefs.current.delete(item.visit.id);
                                }}
                                type="button"
                                onClick={() => {
                                  toggleVisit(item.visit.id);
                                }}
                                className={VISIT_TOGGLE_BUTTON_CLASS_NAME}
                                aria-controls={getVisitDetailsPanelId(item.visit.id)}
                                aria-expanded={isOpen}
                              >
                                <span>{isOpen ? t("hideVisit") : t("showVisit")}</span>
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                  aria-hidden="true"
                                />
                              </button>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.visit.route !== null && (
                              <span className={ROUTE_BADGE_CLASS_NAME}>
                                <Route className="h-3.5 w-3.5" aria-hidden="true" />
                                {item.visit.route}
                              </span>
                            )}
                            {item.visit.imageCount > 0 && (
                              <span className={IMAGE_BADGE_CLASS_NAME}>
                                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                                {item.visit.imageCount}{" "}
                                {t("imageCount", { count: item.visit.imageCount })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {visitHasExpandableDetails === true && (
                      <div
                        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                      >
                        <div
                          className="min-h-0 overflow-hidden"
                          aria-hidden={!isOpen}
                          inert={!isOpen}
                        >
                          <div
                            id={getVisitDetailsPanelId(item.visit.id)}
                            className={`space-y-3 border-t border-emerald-200/70 bg-white/45 px-5 py-4 transition-opacity duration-300 dark:border-emerald-300/15 dark:bg-slate-950/28 ${isOpen ? "opacity-100" : "opacity-0"}`}
                          >
                            {item.visit.note !== null && (
                              <section className="space-y-3">
                                <h4 className={DETAIL_SECTION_HEADING_CLASS_NAME}>
                                  <FileText
                                    className="h-4 w-4 text-muted-foreground"
                                    aria-hidden="true"
                                  />
                                  {t("detailsTitle")}
                                </h4>
                                <div className="prose prose-sm text-foreground dark:prose-invert max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {item.visit.note}
                                  </ReactMarkdown>
                                </div>
                              </section>
                            )}
                            {item.visit.imageCount > 0 && (
                              <section className="space-y-3">
                                <h4 className={DETAIL_SECTION_HEADING_CLASS_NAME}>
                                  <Images
                                    className="h-4 w-4 text-muted-foreground"
                                    aria-hidden="true"
                                  />
                                  {t("imagesTitle")}
                                </h4>
                                {shouldShowImageLoadingState === true && (
                                  <p className="text-sm text-muted-foreground">
                                    {t("loadingVisitDetails")}
                                  </p>
                                )}
                                {shouldShowImageErrorState === true && (
                                  <p className="text-sm text-muted-foreground">
                                    {t("visitDetailsLoadFailed")}
                                  </p>
                                )}
                                {images.length > 0 && <VisitImageGallery images={images} />}
                              </section>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })()
            ) : (
              <li
                key={`stop-${item.stop.id}`}
                className="rounded-3xl border border-white/45 bg-white/60 px-5 py-4 shadow-[0_12px_24px_rgba(148,163,184,0.12)] dark:border-white/10 dark:bg-slate-950/38 dark:shadow-[0_16px_28px_rgba(2,6,23,0.24)]"
              >
                <div className="flex items-start gap-3">
                  <span className={ITINERARY_NUMBER_BADGE_CLASS_NAME}>{item.tripStopOrder}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-primary">
                      {formatFinnishDate(item.stop.visitedOn)}
                    </p>
                    <div className="mt-2">
                      <span className={STOP_KIND_BADGE_CLASS_NAME}>{t("stopLabel")}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight">
                      {item.stop.location.displayName}
                    </h3>
                    {item.stop.note !== null && (
                      <p className="mt-3 text-sm text-foreground/82 dark:text-sky-100/82">
                        {item.stop.note}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ),
          )}
        </ol>
      </section>
    </div>
  );
};
