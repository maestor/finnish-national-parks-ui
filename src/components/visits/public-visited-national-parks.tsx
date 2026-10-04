"use client";

import { CalendarRange, Sparkles, TentTree } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  StickySectionNavigation,
  type StickySectionNavigationItem,
} from "@/components/navigation/sticky-section-navigation";
import { AppImage } from "@/components/ui/app-image";
import { PROGRESS_FILL_CLASS_NAME, PROGRESS_TRACK_CLASS_NAME } from "@/components/ui/theme-styles";
import { formatFinnishDate } from "@/lib/fi-date";
import {
  createParkVisitHref,
  type PublicMissingMagnetParkItem,
  type PublicVisitedMagnetParkGroup,
  type PublicVisitedMagnetParksModel,
} from "@/lib/public-visits";

interface PublicVisitedNationalParksProps {
  model: PublicVisitedMagnetParksModel;
}

const SUMMARY_STAT_CARD_CLASS_NAME =
  "rounded-3xl border border-border theme-memory p-4 shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]";
export const MAGNET_NATIONAL_PARKS_SECTION_ID = "magneettijahti-kansallispuistot";
export const MAGNET_OTHER_PLACES_SECTION_ID = "magneettijahti-muut-paikat";
export const MAGNET_MISSING_SECTION_ID = "magneettijahti-puuttuvat";

const findEarlierDate = (left: string | null, right: string | null) => {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left.localeCompare(right) <= 0 ? left : right;
};

const findLaterDate = (left: string | null, right: string | null) => {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left.localeCompare(right) >= 0 ? left : right;
};

const MagnetGroupCards = ({
  headingId,
  title,
  model,
  sectionId,
  sectionScrollMarginTop,
}: {
  headingId: string;
  title: string;
  model: PublicVisitedMagnetParkGroup;
  sectionId: string;
  sectionScrollMarginTop: string;
}) => {
  const t = useTranslations("visits");

  if (model.visitedParks.length === 0) {
    return null;
  }

  return (
    <section
      id={sectionId}
      aria-labelledby={headingId}
      className="mt-6 space-y-6"
      style={{ scrollMarginTop: sectionScrollMarginTop }}
    >
      <div className="flex items-center gap-2 px-1">
        <TentTree className="h-4 w-4 text-link" aria-hidden="true" />
        <h2 id={headingId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {model.visitedParks.map((park) => (
          <article
            key={park.park.slug}
            className="rounded-[2rem] border border-border theme-memory p-5 shadow-[0_20px_48px_rgba(var(--shadow-rgb),0.16)] backdrop-blur-xl dark:shadow-[0_24px_52px_rgba(var(--shadow-rgb),0.32)]"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] border border-border theme-action text-lg font-semibold text-action-foreground shadow-[0_10px_24px_rgba(var(--shadow-rgb),0.24)]">
                  {park.order}.
                </div>

                {park.park.logoUrl ? (
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden sm:h-20 sm:w-28 sm:rounded-3xl sm:border sm:border-border sm:bg-control sm:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] dark:sm:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]">
                    <AppImage
                      alt={park.park.name}
                      className="object-contain sm:p-3"
                      fill
                      sizes="(max-width: 639px) 80px, 112px"
                      src={park.park.logoUrl}
                      unoptimized
                    />
                  </div>
                ) : null}

                <div className="min-w-0 flex-1">
                  <Link
                    href={createParkVisitHref({
                      parkSlug: park.park.slug,
                      visitId: park.firstVisit.id,
                    })}
                    className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <h3 className="text-base font-semibold tracking-tight sm:text-2xl">
                      {park.park.name}
                    </h3>
                  </Link>
                </div>
              </div>

              <div className="w-full space-y-5">
                <div className="rounded-[1.6rem] border border-border theme-panel px-4 py-4 shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.56)]  dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]">
                  <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                    {t("parks.item.firstVisit")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                    {formatFinnishDate(park.firstVisit.visitedOn)}
                  </p>
                </div>

                {park.laterVisits.length > 0 ? (
                  <details className="group rounded-[1.6rem] border border-border bg-control shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.5)] dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]">
                    <summary className="cursor-pointer list-none px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="text-sm font-medium">
                        {t("parks.item.otherVisits", { count: park.laterVisits.length })}
                      </span>
                    </summary>
                    <ol className="space-y-2 px-4 pb-4">
                      {park.laterVisits.map((visit) => (
                        <li key={visit.id}>
                          <Link
                            href={createParkVisitHref({
                              parkSlug: park.park.slug,
                              visitId: visit.id,
                            })}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-border theme-memory px-3 py-3 text-sm shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.5)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]"
                          >
                            <span>{formatFinnishDate(visit.visitedOn)}</span>
                            <span className="text-xs font-medium text-link">
                              {t("item.viewVisit")}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

const MissingMagnetParks = ({
  headingId,
  parks,
  sectionId,
  sectionScrollMarginTop,
}: {
  headingId: string;
  parks: PublicMissingMagnetParkItem[];
  sectionId: string;
  sectionScrollMarginTop: string;
}) => {
  const t = useTranslations("visits");

  if (parks.length === 0) {
    return null;
  }

  return (
    <section
      id={sectionId}
      aria-labelledby={headingId}
      className="mt-6 space-y-4"
      style={{ scrollMarginTop: sectionScrollMarginTop }}
    >
      <div className="flex items-center gap-2 px-1">
        <TentTree className="h-4 w-4 text-link" aria-hidden="true" />
        <h2 id={headingId} className="text-lg font-semibold tracking-tight">
          {t("parks.sections.missing")}
        </h2>
      </div>

      <div className="rounded-[2rem] border border-border bg-control p-3 shadow-[0_20px_48px_rgba(var(--shadow-rgb),0.16)] backdrop-blur-xl dark:shadow-[0_24px_52px_rgba(var(--shadow-rgb),0.32)]">
        <ul className="grid gap-2 md:grid-cols-2">
          {parks.map((park) => (
            <li key={park.park.slug}>
              <Link
                href={createParkVisitHref({
                  parkSlug: park.park.slug,
                })}
                className="flex items-center gap-3 rounded-[1.4rem] border border-border theme-memory px-3 py-3 shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.5)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]"
              >
                <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-control">
                  {park.park.logoUrl ? (
                    <AppImage
                      alt={park.park.name}
                      className="object-contain p-2"
                      fill
                      sizes="64px"
                      src={park.park.logoUrl}
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <TentTree className="h-5 w-5 text-primary/75" aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-base font-semibold tracking-tight">{park.park.name}</p>
                  <p className="text-sm text-muted-foreground">{park.park.typeLabel}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export const PublicVisitedNationalParks = ({ model }: PublicVisitedNationalParksProps) => {
  const t = useTranslations("visits");
  const hasNationalParks = model.nationalParks.visitedParks.length > 0;
  const hasOtherMagnetPlaces = model.otherMagnetPlaces.visitedParks.length > 0;
  const hasMissingParks = model.missingParks.length > 0;
  const totalVisitedParks =
    model.nationalParks.visitedParkCount + model.otherMagnetPlaces.visitedParkCount;
  const totalParks = model.nationalParks.totalParks + model.otherMagnetPlaces.totalParks;
  const combinedProgressPercent =
    totalParks === 0 ? 0 : Math.min(100, Math.round((totalVisitedParks / totalParks) * 100));
  const firstMagnetEarnedOn = findEarlierDate(
    model.nationalParks.firstMagnetEarnedOn,
    model.otherMagnetPlaces.firstMagnetEarnedOn,
  );
  const latestMagnetEarnedOn = findLaterDate(
    model.nationalParks.latestMagnetEarnedOn,
    model.otherMagnetPlaces.latestMagnetEarnedOn,
  );
  const [stickySectionNavHeight, setStickySectionNavHeight] = useState(0);

  if (!hasNationalParks && !hasOtherMagnetPlaces) {
    return (
      <section className="rounded-[2rem] border border-dashed border-border theme-panel p-8 text-center backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1.3rem] border border-border bg-control shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.08)]">
            <TentTree className="h-5 w-5 text-link" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">{t("views.parks")}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{t("parks.empty")}</p>
        </div>
      </section>
    );
  }

  const sectionNavigationItems: StickySectionNavigationItem[] = [];

  if (hasNationalParks) {
    sectionNavigationItems.push({
      id: MAGNET_NATIONAL_PARKS_SECTION_ID,
      label: t("parks.sections.nationalParks"),
    });
  }

  if (hasOtherMagnetPlaces) {
    sectionNavigationItems.push({
      id: MAGNET_OTHER_PLACES_SECTION_ID,
      label: t("parks.sections.otherPlaces"),
    });
  }

  if (hasMissingParks) {
    sectionNavigationItems.push({
      id: MAGNET_MISSING_SECTION_ID,
      label: t("parks.sections.missing"),
    });
  }

  const magnetSectionScrollMarginTop = `calc(var(--page-sticky-nav-top, 0rem) + ${stickySectionNavHeight}px)`;

  return (
    <>
      <section className="rounded-[2rem] border border-border theme-memory p-5 shadow-[0_24px_60px_rgba(59,130,246,0.16)] backdrop-blur-xl dark:shadow-[0_28px_64px_rgba(var(--shadow-rgb),0.34)] sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-control px-3 py-1 text-sm font-medium text-link shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)]  dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.08)]">
                <TentTree className="h-4 w-4" aria-hidden="true" />
                <span>{t("parks.summary.title")}</span>
              </div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("views.parks")}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                {t("parks.summary.description")}
              </p>
            </div>

            <div className="rounded-[1.8rem] border border-border bg-control px-4 py-4 shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.58)]  dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.06)]">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                    {t("parks.summary.progressLabel")}
                  </p>
                  <div className="mt-2">
                    <span className="text-4xl font-semibold tracking-tight">
                      {model.nationalParks.visitedParkCount} / {model.nationalParks.totalParks}
                    </span>
                  </div>
                </div>

                {(model.otherMagnetPlaces.totalParks > 0 || hasOtherMagnetPlaces) && (
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                      {t("parks.otherPlaces.progressLabel")}
                    </p>
                    <div className="mt-2">
                      <span className="text-3xl font-semibold tracking-tight">
                        {model.otherMagnetPlaces.visitedParkCount} /{" "}
                        {model.otherMagnetPlaces.totalParks}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                {t("parks.summary.totalProgressLabel")}
              </p>
              <p className="text-sm font-medium text-muted-foreground">
                {totalVisitedParks} / {totalParks}
              </p>
            </div>
            <div
              aria-label={t("parks.summary.totalProgressLabel")}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={combinedProgressPercent}
              className={`relative h-4 ${PROGRESS_TRACK_CLASS_NAME}`}
              role="progressbar"
            >
              <div
                className={`h-full ${PROGRESS_FILL_CLASS_NAME} transition-[width]`}
                style={{ width: `${combinedProgressPercent}%` }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className={SUMMARY_STAT_CARD_CLASS_NAME}>
              <div className="flex items-center gap-2 text-link">
                <CalendarRange className="h-4 w-4" aria-hidden="true" />
                <p className="text-sm font-medium">{t("parks.summary.firstPark")}</p>
              </div>
              <p className="mt-3 text-lg font-semibold tracking-tight">
                {firstMagnetEarnedOn ? formatFinnishDate(firstMagnetEarnedOn) : "—"}
              </p>
            </div>

            <div className={SUMMARY_STAT_CARD_CLASS_NAME}>
              <div className="flex items-center gap-2 text-link">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <p className="text-sm font-medium">{t("parks.summary.latestPark")}</p>
              </div>
              <p className="mt-3 text-lg font-semibold tracking-tight">
                {latestMagnetEarnedOn ? formatFinnishDate(latestMagnetEarnedOn) : "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <StickySectionNavigation
        ariaLabel={t("parks.sectionNavigationLabel")}
        className="mt-6"
        items={sectionNavigationItems}
        onHeightChange={setStickySectionNavHeight}
      />

      <MagnetGroupCards
        headingId="magnet-national-parks-title"
        title={t("parks.sections.nationalParks")}
        model={model.nationalParks}
        sectionId={MAGNET_NATIONAL_PARKS_SECTION_ID}
        sectionScrollMarginTop={magnetSectionScrollMarginTop}
      />

      {(model.otherMagnetPlaces.totalParks > 0 || hasOtherMagnetPlaces) && (
        <MagnetGroupCards
          headingId="magnet-other-places-title"
          title={t("parks.sections.otherPlaces")}
          model={model.otherMagnetPlaces}
          sectionId={MAGNET_OTHER_PLACES_SECTION_ID}
          sectionScrollMarginTop={magnetSectionScrollMarginTop}
        />
      )}

      <MissingMagnetParks
        headingId="magnet-missing-title"
        parks={model.missingParks}
        sectionId={MAGNET_MISSING_SECTION_ID}
        sectionScrollMarginTop={magnetSectionScrollMarginTop}
      />
    </>
  );
};
