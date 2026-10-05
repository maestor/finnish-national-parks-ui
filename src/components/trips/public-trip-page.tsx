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
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { EditIconLink } from "@/components/admin/edit-icon-link";
import {
  PUBLIC_EYEBROW_BADGE_CLASS_NAME,
  PUBLIC_HERO_HEADING_STACK_CLASS_NAME,
  PUBLIC_HERO_ICON_BUTTON_CLASS_NAME,
  PUBLIC_HERO_TITLE_CLASS_NAME,
  PUBLIC_META_BADGE_CLASS_NAME,
  PUBLIC_META_DATE_CLASS_NAME,
  PUBLIC_PAGE_SHELL_CLASS_NAME,
  PUBLIC_PANEL_CLASS_NAME,
} from "@/components/layout/public-page-styles";
import {
  StickySectionNavigation,
  type StickySectionNavigationItem,
} from "@/components/navigation/sticky-section-navigation";
import { AppImage } from "@/components/ui/app-image";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { VisitImageGallery } from "@/components/visits/visit-image-gallery";
import { useAuth } from "@/hooks/use-auth";
import { apiPublicFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatFinnishDate, formatFinnishDateRange } from "@/lib/fi-date";
import {
  fetchAdminTripPreviewRoute,
  fetchAdminTripPreviewStopImages,
  fetchAdminTripPreviewVisitImages,
  fetchPublicTripRoute,
  fetchPublicTripStopImages,
} from "@/lib/public-trip";
import {
  createTripItineraryItemKey,
  tripStopHasExpandableDetails,
  tripVisitHasExpandableDetails,
} from "@/lib/public-trip-visit-details";
import { createParkVisitHref } from "@/lib/public-visits";
import { appRoutes } from "@/lib/routes";
import {
  getTripStopDisplayName,
  type PublicTripDetail,
  type PublicTripRouteStatus,
  type PublicTripStopImagesResponse,
  type PublicTripVisitImagesResponse,
} from "@/lib/trips";
import { DeferredMap } from "../map/deferred-map";
import { LazyPublicTripMap } from "./lazy-public-trip-map";

interface PublicTripPageProps {
  isPreview?: boolean;
  trip: PublicTripDetail;
}

interface ItineraryItemTarget {
  isExpandable: boolean;
  kind: "stop" | "visit";
}

interface ImageDetailsState extends PublicTripVisitImagesResponse {
  isLoadingMore: boolean;
  loadMoreFailed: boolean;
  status: "loading" | "ready" | "error";
}

const ROUTE_BADGE_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-full border border-border theme-memory px-2.5 py-1 text-sm leading-none font-semibold text-emerald-900 shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)]  dark:text-emerald-200 dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.08)]";
const IMAGE_BADGE_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-full border border-border theme-memory px-2.5 py-1 text-sm leading-none font-semibold text-link shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.08)]";
const ITINERARY_NUMBER_BADGE_CLASS_NAME =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-border bg-control px-2 text-sm font-semibold text-link shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.56)]";
const DETAIL_SECTION_HEADING_CLASS_NAME =
  "flex items-center gap-2 border-b border-border pb-2 text-base font-semibold";
const VISIT_TOGGLE_BUTTON_CLASS_NAME =
  "inline-flex items-center gap-2 rounded-full border border-border bg-control px-3 py-1.5 text-xs font-medium text-link shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const VISIT_CARD_CLASS_NAME =
  "overflow-hidden rounded-3xl border border-border theme-memory shadow-[0_16px_34px_rgba(var(--shadow-rgb),0.12),0_10px_24px_rgba(var(--shadow-rgb),0.12)]  dark:shadow-[0_20px_38px_rgba(var(--shadow-rgb),0.28)]";
const VISIT_KIND_BADGE_CLASS_NAME =
  "inline-flex items-center rounded-full border border-border bg-emerald-50 px-2.5 py-1 text-xs font-semibold tracking-wide text-emerald-900 shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.65)]  dark:bg-emerald-400/10 dark:text-emerald-200";
const STOP_KIND_BADGE_CLASS_NAME =
  "inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-1 text-xs font-semibold tracking-wide text-amber-900 shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.65)] dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200";

const ROUTE_KM_FORMATTER = new Intl.NumberFormat("fi-FI", {
  maximumFractionDigits: 0,
});
const TRIP_DESCRIPTION_SECTION_ID = "trip-description";
const TRIP_ROUTE_SECTION_ID = "trip-route";
const TRIP_ITINERARY_SECTION_ID = "trip-itinerary";
const TRIP_ITINERARY_PROGRESSIVE_THRESHOLD = 12;

const getTripVisitImagesPath = (slug: string, visitId: number) =>
  `/api/trips/slug/${slug}/visits/${visitId}/images`;

const getItineraryDetailsPanelId = (itemKey: string) => `trip-itinerary-details-${itemKey}`;

export const PublicTripPage = ({ trip, isPreview = false }: PublicTripPageProps) => {
  const t = useTranslations("tripPage");
  const auth = useAuth();
  const [routeStatus, setRouteStatus] = useState<PublicTripRouteStatus>(trip.route);
  const [routeLoadState, setRouteLoadState] = useState<"idle" | "loading" | "ready" | "error">(
    trip.route.data !== null ? "ready" : trip.route.success === false ? "error" : "idle",
  );
  const routeRequestRef = useRef<Promise<void> | null>(null);
  const routeControllerRef = useRef<AbortController | null>(null);
  const route = routeStatus.data;
  const startingPoint = trip.startingPoint;
  const shouldShowEditTripLink = isPreview !== true && auth.isAuthenticated === true;
  const shouldShowStopCount = trip.stopCount > 0;
  const shouldShowImageCount = trip.imageCount > 0;
  const shouldShowRouteContent = routeStatus.success && route !== null;
  const shouldShowRouteError = routeLoadState === "error" || routeStatus.success === false;
  const routeErrorMessage =
    routeStatus.error?.errorCode === "trip_planner_budget_exceeded"
      ? t("routeRateLimited")
      : t("routeUnavailable");
  const shouldShowRouteMap =
    startingPoint !== null &&
    (trip.route.available || routeStatus.success === false || shouldShowRouteContent);
  const shouldShowRouteSection = shouldShowRouteContent || shouldShowRouteMap;
  const sectionNavigationItems = useMemo(() => {
    const items: StickySectionNavigationItem[] = [];

    if (trip.description !== null) {
      items.push({
        id: TRIP_DESCRIPTION_SECTION_ID,
        label: t("sectionNav.description"),
      });
    }

    if (shouldShowRouteSection === true) {
      items.push({
        id: TRIP_ROUTE_SECTION_ID,
        label: t("sectionNav.route"),
      });
    }

    if (trip.itinerary.length > 0) {
      items.push({
        id: TRIP_ITINERARY_SECTION_ID,
        label: t("sectionNav.itinerary"),
      });
    }

    return items;
  }, [shouldShowRouteSection, t, trip.description, trip.itinerary.length]);

  const itineraryItemTargets = new Map<string, ItineraryItemTarget>(
    trip.itinerary.map((item) =>
      item.kind === "visit"
        ? [
            createTripItineraryItemKey("visit", item.visit.id),
            {
              isExpandable: tripVisitHasExpandableDetails(item.visit),
              kind: "visit" as const,
            },
          ]
        : [
            createTripItineraryItemKey("stop", item.stop.id),
            {
              isExpandable: tripStopHasExpandableDetails(item.stop),
              kind: "stop" as const,
            },
          ],
    ),
  );
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);
  const [failedFeaturedImageKey, setFailedFeaturedImageKey] = useState<string | null>(null);
  const [imageDetailsByKey, setImageDetailsByKey] = useState<Record<string, ImageDetailsState>>({});
  const [stickySectionNavHeight, setStickySectionNavHeight] = useState(0);
  const [, startVisitDetailsTransition] = useTransition();
  const itineraryItemRefs = useRef(new Map<string, HTMLLIElement>());
  const itineraryToggleButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingScrollItemKeyRef = useRef<string | null>(null);
  const imageDetailsByKeyRef = useRef<Record<string, ImageDetailsState>>({});
  const imageRequestControllersRef = useRef(new Map<string, AbortController>());
  const imageRequestsRef = useRef(new Map<string, Promise<void>>());
  const tripSlugRef = useRef(trip.slug);

  const setImageDetails = useCallback((key: string, state: ImageDetailsState) => {
    const nextDetails = { ...imageDetailsByKeyRef.current, [key]: state };
    imageDetailsByKeyRef.current = nextDetails;
    setImageDetailsByKey(nextDetails);
  }, []);

  const loadImages = useCallback(
    (
      key: string,
      loadPage: (signal: AbortSignal) => Promise<PublicTripVisitImagesResponse>,
      offset = 0,
    ) => {
      const requestKey = `${key}:${offset}`;
      const current = imageDetailsByKeyRef.current[key];

      if (imageRequestsRef.current.has(requestKey)) {
        return imageRequestsRef.current.get(requestKey);
      }

      if (offset === 0 && (current?.status === "loading" || current?.status === "ready")) {
        return;
      }

      if (offset > 0 && (current?.nextOffset !== offset || current.isLoadingMore === true)) {
        return;
      }

      if (offset === 0) {
        setImageDetails(key, {
          images: [],
          isLoadingMore: false,
          loadMoreFailed: false,
          nextOffset: null,
          status: "loading",
        });
      } else if (current) {
        setImageDetails(key, {
          ...current,
          isLoadingMore: true,
          loadMoreFailed: false,
        });
      }

      const controller = new AbortController();
      imageRequestControllersRef.current.set(requestKey, controller);
      const request = loadPage(controller.signal)
        .then((response) => {
          if (controller.signal.aborted) {
            return;
          }

          startVisitDetailsTransition(() => {
            const previous = imageDetailsByKeyRef.current[key];
            const images =
              offset === 0
                ? response.images
                : Array.from(
                    new Map(
                      [...(previous?.images ?? []), ...response.images].map((image) => [
                        image.id,
                        image,
                      ]),
                    ).values(),
                  );
            setImageDetails(key, {
              images,
              isLoadingMore: false,
              loadMoreFailed: false,
              nextOffset: response.nextOffset,
              status: "ready",
            });
          });
        })
        .catch(() => {
          if (controller.signal.aborted) {
            return;
          }

          const previous = imageDetailsByKeyRef.current[key];
          if (offset > 0 && previous) {
            setImageDetails(key, {
              ...previous,
              isLoadingMore: false,
              loadMoreFailed: true,
            });
            return;
          }

          setImageDetails(key, {
            images: [],
            isLoadingMore: false,
            loadMoreFailed: false,
            nextOffset: null,
            status: "error",
          });
        })
        .finally(() => {
          imageRequestControllersRef.current.delete(requestKey);
          imageRequestsRef.current.delete(requestKey);
        });

      imageRequestsRef.current.set(requestKey, request);
      return request;
    },
    [setImageDetails],
  );

  const loadVisitImages = useCallback(
    (visitId: number, offset = 0) =>
      loadImages(
        `visit:${visitId}`,
        (signal) =>
          isPreview === true
            ? fetchAdminTripPreviewVisitImages(trip.id, visitId, { offset, signal })
            : apiPublicFetch<PublicTripVisitImagesResponse>(
                getTripVisitImagesPath(trip.slug, visitId) +
                  (offset === 0 ? "" : `?offset=${offset}`),
                { signal },
              ),
        offset,
      ),
    [isPreview, loadImages, trip.id, trip.slug],
  );

  const loadStopImages = useCallback(
    (stopId: number, offset = 0) =>
      loadImages(
        `stop:${stopId}`,
        (signal) =>
          (isPreview === true
            ? fetchAdminTripPreviewStopImages(trip.id, stopId, { offset, signal })
            : fetchPublicTripStopImages(trip.slug, stopId, { offset, signal })
          ).then((response: PublicTripStopImagesResponse) => response),
        offset,
      ),
    [isPreview, loadImages, trip.id, trip.slug],
  );

  const loadRoute = useCallback(() => {
    if (routeRequestRef.current !== null || routeStatus.data !== null) {
      return routeRequestRef.current ?? Promise.resolve();
    }

    setRouteLoadState("loading");
    const controller = new AbortController();
    routeControllerRef.current = controller;
    const request = (
      isPreview === true
        ? fetchAdminTripPreviewRoute(trip.id, { signal: controller.signal })
        : fetchPublicTripRoute(trip.slug, { signal: controller.signal })
    )
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setRouteStatus(response);
        setRouteLoadState(response.success ? "ready" : "error");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRouteLoadState("error");
        }
      })
      .finally(() => {
        routeRequestRef.current = null;
        routeControllerRef.current = null;
      });

    routeRequestRef.current = request;
    return request;
  }, [isPreview, routeStatus.data, trip.id, trip.slug]);

  useEffect(() => {
    if (tripSlugRef.current !== trip.slug) {
      tripSlugRef.current = trip.slug;
      imageDetailsByKeyRef.current = {};
      setImageDetailsByKey({});
      setRouteStatus(trip.route);
      setRouteLoadState(
        trip.route.data !== null ? "ready" : trip.route.success === false ? "error" : "idle",
      );
    }

    return () => {
      for (const controller of imageRequestControllersRef.current.values()) {
        controller.abort();
      }
      imageRequestControllersRef.current.clear();
      imageRequestsRef.current.clear();
      routeControllerRef.current?.abort();
    };
  }, [trip.route, trip.slug]);

  const ensureVisitDetailsLoaded = (visitId: number) => {
    void loadVisitImages(visitId);
  };

  const ensureStopDetailsLoaded = (stopId: number) => {
    void loadStopImages(stopId);
  };

  useEffect(() => {
    if (
      trip.route.data !== null ||
      trip.route.success === false ||
      trip.route.available !== true ||
      trip.startingPoint === null
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadRoute();
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [loadRoute, trip.route.available, trip.route.data, trip.route.success, trip.startingPoint]);

  useEffect(() => {
    const pendingScrollItemKey = pendingScrollItemKeyRef.current;

    if (pendingScrollItemKey === null) {
      return;
    }

    const itineraryItem = itineraryItemRefs.current.get(pendingScrollItemKey);
    const toggleButton = itineraryToggleButtonRefs.current.get(pendingScrollItemKey);

    itineraryItem?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    toggleButton?.focus({
      preventScroll: true,
    });
    pendingScrollItemKeyRef.current = null;
  });

  const scrollToItineraryItem = (itemKey: string) => {
    const itineraryItem = itineraryItemRefs.current.get(itemKey);
    const toggleButton = itineraryToggleButtonRefs.current.get(itemKey);

    itineraryItem?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    toggleButton?.focus({
      preventScroll: true,
    });
  };

  const openItineraryItemFromMap = (itemKey: string) => {
    const itemTarget = itineraryItemTargets.get(itemKey);

    if (!itemTarget) {
      return;
    }

    if (itemTarget.kind === "visit") {
      ensureVisitDetailsLoaded(Number(itemKey.slice("visit:".length)));
    } else {
      ensureStopDetailsLoaded(Number(itemKey.slice("stop:".length)));
    }

    if (itemTarget.isExpandable === false) {
      scrollToItineraryItem(itemKey);
      return;
    }

    if (openItemKey === itemKey) {
      scrollToItineraryItem(itemKey);
      return;
    }

    pendingScrollItemKeyRef.current = itemKey;
    setOpenItemKey(itemKey);
  };

  const toggleItineraryItem = (itemKey: string) => {
    const itemTarget = itineraryItemTargets.get(itemKey);

    if (itemTarget?.kind === "visit") {
      ensureVisitDetailsLoaded(Number(itemKey.slice("visit:".length)));
    } else if (itemTarget?.kind === "stop") {
      ensureStopDetailsLoaded(Number(itemKey.slice("stop:".length)));
    }

    setOpenItemKey((currentOpenItemKey) => (currentOpenItemKey === itemKey ? null : itemKey));
  };

  const tripSectionScrollMarginTop = `calc(var(--page-sticky-nav-top, 0rem) + ${stickySectionNavHeight}px)`;
  const hasFeaturedImage =
    trip.featuredImage !== null && failedFeaturedImageKey !== trip.featuredImage.fullUrl;

  return (
    <div className={PUBLIC_PAGE_SHELL_CLASS_NAME}>
      <section
        className={cn(
          PUBLIC_PANEL_CLASS_NAME,
          hasFeaturedImage && "relative min-h-104 overflow-hidden sm:min-h-120",
        )}
      >
        {hasFeaturedImage && trip.featuredImage !== null && (
          <AppImage
            src={trip.featuredImage.fullUrl}
            alt=""
            fill
            sizes="(max-width: 1024px) calc(100vw - 2rem), 1024px"
            className="object-cover object-center"
            onError={() => setFailedFeaturedImageKey(trip.featuredImage?.fullUrl ?? null)}
            privateMedia={isPreview}
            priority
          />
        )}
        {hasFeaturedImage === true && (
          <div
            className="absolute inset-0 bg-gradient-to-r from-hero/55 via-hero/15 to-hero/10"
            aria-hidden="true"
          />
        )}
        <div
          className={cn(
            "relative",
            hasFeaturedImage && "rounded-2xl bg-hero/50 p-4 text-hero-foreground sm:p-6",
          )}
        >
          <div className={PUBLIC_HERO_HEADING_STACK_CLASS_NAME}>
            <div
              className={cn(
                PUBLIC_EYEBROW_BADGE_CLASS_NAME,
                hasFeaturedImage && "border-input bg-hero bg-none text-hero-foreground",
              )}
            >
              <TentTree className="h-4 w-4" aria-hidden="true" />
              <span>{t("eyebrow")}</span>
            </div>
            <h1 className={PUBLIC_HERO_TITLE_CLASS_NAME}>{trip.name}</h1>
            {trip.dateRange !== null && (
              <p
                className={cn(
                  PUBLIC_META_DATE_CLASS_NAME,
                  hasFeaturedImage && "w-fit rounded-full bg-hero px-3 py-1 text-hero-foreground",
                )}
              >
                {formatFinnishDateRange(trip.dateRange.start, trip.dateRange.end)}
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className={PUBLIC_META_BADGE_CLASS_NAME}>
              <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
              {trip.visitCount} {t("visitCount", { count: trip.visitCount })}
            </span>
            {shouldShowStopCount === true && (
              <span className={PUBLIC_META_BADGE_CLASS_NAME}>
                <Signpost className="h-3.5 w-3.5" aria-hidden="true" />
                {trip.stopCount} {t("stopCount", { count: trip.stopCount })}
              </span>
            )}
            {shouldShowImageCount === true && (
              <span className={PUBLIC_META_BADGE_CLASS_NAME}>
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                {trip.imageCount} {t("imageCount", { count: trip.imageCount })}
              </span>
            )}
            {isPreview !== true && (
              <CopyLinkButton
                href={appRoutes.trip(trip.slug)}
                label={t("copyTripPageLink")}
                copiedLabel={t("tripPageLinkCopied")}
                tooltipSide="top"
                className={PUBLIC_HERO_ICON_BUTTON_CLASS_NAME}
                iconClassName="h-3.5 w-3.5"
              />
            )}
            {shouldShowEditTripLink === true && (
              <EditIconLink
                href={appRoutes.controlPanel.editTrip(trip.id)}
                label={t("editTrip")}
                className={PUBLIC_HERO_ICON_BUTTON_CLASS_NAME}
                iconClassName="h-3.5 w-3.5"
              />
            )}
          </div>
        </div>
      </section>

      <StickySectionNavigation
        ariaLabel={t("sectionNavigationLabel")}
        items={sectionNavigationItems}
        onHeightChange={setStickySectionNavHeight}
      />

      {trip.description !== null && (
        <section
          id={TRIP_DESCRIPTION_SECTION_ID}
          className={PUBLIC_PANEL_CLASS_NAME}
          style={{ scrollMarginTop: tripSectionScrollMarginTop }}
          aria-labelledby="trip-description-title"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-link" aria-hidden="true" />
            <h2 id="trip-description-title" className="text-lg font-semibold tracking-tight">
              {t("descriptionTitle")}
            </h2>
          </div>
          <MarkdownContent className="mt-4">{trip.description}</MarkdownContent>
        </section>
      )}

      {shouldShowRouteSection === true && (
        <section
          id={TRIP_ROUTE_SECTION_ID}
          className={PUBLIC_PANEL_CLASS_NAME}
          style={{ scrollMarginTop: tripSectionScrollMarginTop }}
          aria-labelledby="trip-route-title"
        >
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-link" aria-hidden="true" />
            <h2 id="trip-route-title" className="text-lg font-semibold tracking-tight">
              {t("routeTitle")}
            </h2>
          </div>
          {shouldShowRouteError === true && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-700/35 bg-red-50 px-4 py-3 text-sm font-medium text-red-950 dark:border-red-300/40 dark:bg-red-950/80 dark:text-red-50">
              <p role="alert">{routeErrorMessage}</p>
              {routeLoadState === "error" && routeStatus.success !== false && (
                <button
                  type="button"
                  className="font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 dark:focus-visible:ring-red-200"
                  onClick={() => void loadRoute()}
                >
                  {t("retryRoute")}
                </button>
              )}
            </div>
          )}
          {shouldShowRouteMap === true && (
            <div className="relative mt-4 overflow-hidden rounded-[1.75rem]">
              <DeferredMap
                className="h-[75dvh] min-h-104 max-h-200"
                label={t("mapAriaLabel", { trip: trip.name })}
                loadImmediately
                showLoadAction={false}
              >
                <LazyPublicTripMap
                  onItineraryItemAction={openItineraryItemFromMap}
                  route={route}
                  startingPoint={startingPoint}
                  tripName={trip.name}
                  tripStops={trip.itinerary}
                />
              </DeferredMap>
              {routeLoadState === "loading" && (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-hero/20 p-4 dark:bg-hero/45">
                  <p
                    className="rounded-2xl border border-border bg-control px-4 py-3 text-center text-sm font-semibold text-link shadow-xl"
                    role="status"
                    aria-live="polite"
                  >
                    {t("loadingRoute")}
                  </p>
                </div>
              )}
            </div>
          )}
          {shouldShowRouteContent === true && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={PUBLIC_META_BADGE_CLASS_NAME}>
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

      <section
        id={TRIP_ITINERARY_SECTION_ID}
        className={PUBLIC_PANEL_CLASS_NAME}
        style={{ scrollMarginTop: tripSectionScrollMarginTop }}
        aria-labelledby="trip-itinerary-title"
      >
        <div className="flex items-center gap-2">
          <Signpost className="h-4 w-4 text-link" aria-hidden="true" />
          <h2 id="trip-itinerary-title" className="text-lg font-semibold tracking-tight">
            {t("itineraryTitle")}
          </h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("itineraryDescription")}</p>

        <ol aria-label={t("itineraryTitle")} className="mt-5 space-y-4">
          {trip.itinerary.map((item) =>
            item.kind === "visit"
              ? (() => {
                  const itemKey = createTripItineraryItemKey("visit", item.visit.id);
                  const isOpen = openItemKey === itemKey;
                  const visitHasExpandableDetails = tripVisitHasExpandableDetails(item.visit);
                  const visitDetails = imageDetailsByKey[`visit:${item.visit.id}`];
                  const images = visitDetails?.images ?? [];
                  const shouldShowImageLoadingState =
                    item.visit.imageCount > 0 &&
                    images.length === 0 &&
                    visitDetails?.status !== "error" &&
                    visitDetails?.status !== "ready";
                  const shouldShowImageErrorState =
                    item.visit.imageCount > 0 &&
                    images.length === 0 &&
                    visitDetails?.status === "error";

                  return (
                    <li
                      key={`visit-${item.visit.id}`}
                      ref={(node) => {
                        if (node) {
                          itineraryItemRefs.current.set(itemKey, node);
                          return;
                        }

                        itineraryItemRefs.current.delete(itemKey);
                      }}
                      className={cn(
                        VISIT_CARD_CLASS_NAME,
                        trip.itinerary.length >= TRIP_ITINERARY_PROGRESSIVE_THRESHOLD &&
                          "public-trip-itinerary-item",
                      )}
                    >
                      <div className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span className={ITINERARY_NUMBER_BADGE_CLASS_NAME}>
                            {item.tripStopOrder}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-link">
                                  {formatFinnishDate(item.visit.visitedOn)}
                                </p>
                                <div className="mt-2">
                                  <span className={VISIT_KIND_BADGE_CLASS_NAME}>
                                    {t("visitLabel")}
                                  </span>
                                </div>
                                <h3 className="mt-2 text-lg font-semibold tracking-tight">
                                  {isPreview === true ? (
                                    item.visit.park.name
                                  ) : (
                                    <Link
                                      href={createParkVisitHref({
                                        parkSlug: item.visit.park.slug,
                                        visitId: item.visit.id,
                                      })}
                                      className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                      {item.visit.park.name}
                                    </Link>
                                  )}
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {item.visit.park.typeLabel}
                                </p>
                              </div>
                              {visitHasExpandableDetails === true && (
                                <button
                                  ref={(node) => {
                                    if (node) {
                                      itineraryToggleButtonRefs.current.set(itemKey, node);
                                      return;
                                    }

                                    itineraryToggleButtonRefs.current.delete(itemKey);
                                  }}
                                  type="button"
                                  onClick={() => {
                                    toggleItineraryItem(itemKey);
                                  }}
                                  className={VISIT_TOGGLE_BUTTON_CLASS_NAME}
                                  aria-controls={getItineraryDetailsPanelId(itemKey)}
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
                              id={getItineraryDetailsPanelId(itemKey)}
                              className={`space-y-3 border-t border-border bg-control px-5 py-4 transition-opacity duration-300  ${isOpen ? "opacity-100" : "opacity-0"}`}
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
                                  <MarkdownContent>{item.visit.note}</MarkdownContent>
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
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                      <p role="alert">{t("visitDetailsLoadFailed")}</p>
                                      <button
                                        type="button"
                                        className="font-medium text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        onClick={() => void loadVisitImages(item.visit.id)}
                                      >
                                        {t("retryVisitDetails")}
                                      </button>
                                    </div>
                                  )}
                                  {images.length > 0 && (
                                    <VisitImageGallery images={images} privateMedia={isPreview} />
                                  )}
                                  {visitDetails?.isLoadingMore === true && (
                                    <p className="text-sm text-muted-foreground">
                                      {t("loadingMoreVisitImages")}
                                    </p>
                                  )}
                                  {visitDetails?.loadMoreFailed === true && (
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                      <p role="alert">{t("visitDetailsLoadFailed")}</p>
                                      <button
                                        type="button"
                                        className="font-medium text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        onClick={() =>
                                          visitDetails.nextOffset !== null &&
                                          void loadVisitImages(
                                            item.visit.id,
                                            visitDetails.nextOffset,
                                          )
                                        }
                                      >
                                        {t("retryVisitDetails")}
                                      </button>
                                    </div>
                                  )}
                                  {visitDetails !== undefined &&
                                    visitDetails.nextOffset !== null &&
                                    visitDetails.status === "ready" &&
                                    visitDetails.isLoadingMore === false &&
                                    visitDetails.loadMoreFailed === false && (
                                      <button
                                        type="button"
                                        className="text-sm font-medium text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        onClick={() =>
                                          void loadVisitImages(
                                            item.visit.id,
                                            visitDetails.nextOffset ?? 0,
                                          )
                                        }
                                      >
                                        {t("loadMoreVisitImages")}
                                      </button>
                                    )}
                                </section>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })()
              : (() => {
                  const itemKey = createTripItineraryItemKey("stop", item.stop.id);
                  const isOpen = openItemKey === itemKey;
                  const stopHasExpandableDetails = tripStopHasExpandableDetails(item.stop);
                  const stopDetails = imageDetailsByKey[`stop:${item.stop.id}`];
                  const stopImages = stopDetails?.images ?? [];
                  const shouldShowStopImageLoadingState =
                    item.stop.imageCount > 0 &&
                    stopImages.length === 0 &&
                    stopDetails?.status !== "error" &&
                    stopDetails?.status !== "ready";
                  const shouldShowStopImageErrorState =
                    item.stop.imageCount > 0 &&
                    stopImages.length === 0 &&
                    stopDetails?.status === "error";

                  return (
                    <li
                      key={`stop-${item.stop.id}`}
                      ref={(node) => {
                        if (node) {
                          itineraryItemRefs.current.set(itemKey, node);
                          return;
                        }

                        itineraryItemRefs.current.delete(itemKey);
                      }}
                      className={cn(
                        "rounded-3xl border border-border theme-memory shadow-[0_12px_24px_rgba(var(--shadow-rgb),0.12)] dark:shadow-[0_16px_28px_rgba(var(--shadow-rgb),0.24)]",
                        trip.itinerary.length >= TRIP_ITINERARY_PROGRESSIVE_THRESHOLD &&
                          "public-trip-itinerary-item",
                      )}
                    >
                      <div className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span className={ITINERARY_NUMBER_BADGE_CLASS_NAME}>
                            {item.tripStopOrder}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-link">
                                  {formatFinnishDate(item.stop.visitedOn)}
                                </p>
                                <div className="mt-2">
                                  <span className={STOP_KIND_BADGE_CLASS_NAME}>
                                    {t("stopLabel")}
                                  </span>
                                </div>
                                <h3 className="mt-2 text-lg font-semibold tracking-tight">
                                  {getTripStopDisplayName(item.stop)}
                                </h3>
                              </div>
                              {stopHasExpandableDetails === true && (
                                <button
                                  ref={(node) => {
                                    if (node) {
                                      itineraryToggleButtonRefs.current.set(itemKey, node);
                                      return;
                                    }

                                    itineraryToggleButtonRefs.current.delete(itemKey);
                                  }}
                                  type="button"
                                  onClick={() => {
                                    toggleItineraryItem(itemKey);
                                  }}
                                  className={VISIT_TOGGLE_BUTTON_CLASS_NAME}
                                  aria-controls={getItineraryDetailsPanelId(itemKey)}
                                  aria-expanded={isOpen}
                                >
                                  <span>{isOpen ? t("hideStop") : t("showStop")}</span>
                                  <ChevronDown
                                    className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                    aria-hidden="true"
                                  />
                                </button>
                              )}
                            </div>
                            {item.stop.imageCount > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className={IMAGE_BADGE_CLASS_NAME}>
                                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                                  {item.stop.imageCount}{" "}
                                  {t("imageCount", { count: item.stop.imageCount })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {stopHasExpandableDetails === true && (
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
                              id={getItineraryDetailsPanelId(itemKey)}
                              className={`space-y-3 border-t border-border bg-control px-5 py-4 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
                            >
                              {item.stop.note !== null && (
                                <section className="space-y-3">
                                  <h4 className={DETAIL_SECTION_HEADING_CLASS_NAME}>
                                    <FileText
                                      className="h-4 w-4 text-muted-foreground"
                                      aria-hidden="true"
                                    />
                                    {t("detailsTitle")}
                                  </h4>
                                  <MarkdownContent>{item.stop.note}</MarkdownContent>
                                </section>
                              )}
                              {item.stop.imageCount > 0 && (
                                <section className="space-y-3">
                                  <h4 className={DETAIL_SECTION_HEADING_CLASS_NAME}>
                                    <Images
                                      className="h-4 w-4 text-muted-foreground"
                                      aria-hidden="true"
                                    />
                                    {t("imagesTitle")}
                                  </h4>
                                  {shouldShowStopImageLoadingState === true && (
                                    <p className="text-sm text-muted-foreground">
                                      {t("loadingVisitDetails")}
                                    </p>
                                  )}
                                  {shouldShowStopImageErrorState === true && (
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                      <p role="alert">{t("visitDetailsLoadFailed")}</p>
                                      <button
                                        type="button"
                                        className="font-medium text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        onClick={() => void loadStopImages(item.stop.id)}
                                      >
                                        {t("retryVisitDetails")}
                                      </button>
                                    </div>
                                  )}
                                  {stopImages.length > 0 && (
                                    <VisitImageGallery
                                      images={stopImages}
                                      privateMedia={isPreview}
                                    />
                                  )}
                                  {stopDetails?.isLoadingMore === true && (
                                    <p className="text-sm text-muted-foreground">
                                      {t("loadingMoreVisitImages")}
                                    </p>
                                  )}
                                  {stopDetails?.loadMoreFailed === true && (
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                      <p role="alert">{t("visitDetailsLoadFailed")}</p>
                                      <button
                                        type="button"
                                        className="font-medium text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        onClick={() =>
                                          stopDetails.nextOffset !== null &&
                                          void loadStopImages(item.stop.id, stopDetails.nextOffset)
                                        }
                                      >
                                        {t("retryVisitDetails")}
                                      </button>
                                    </div>
                                  )}
                                  {stopDetails !== undefined &&
                                    stopDetails.nextOffset !== null &&
                                    stopDetails.status === "ready" &&
                                    stopDetails.isLoadingMore === false &&
                                    stopDetails.loadMoreFailed === false && (
                                      <button
                                        type="button"
                                        className="text-sm font-medium text-link underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        onClick={() =>
                                          void loadStopImages(
                                            item.stop.id,
                                            stopDetails.nextOffset ?? 0,
                                          )
                                        }
                                      >
                                        {t("loadMoreVisitImages")}
                                      </button>
                                    )}
                                </section>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })(),
          )}
        </ol>
      </section>
    </div>
  );
};
