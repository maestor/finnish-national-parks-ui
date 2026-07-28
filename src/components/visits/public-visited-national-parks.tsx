import { CalendarRange, Sparkles, TentTree } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AppImage } from "@/components/ui/app-image";
import { formatFinnishDate } from "@/lib/fi-date";
import { createParkVisitHref, type PublicVisitedNationalParksModel } from "@/lib/public-visits";

interface PublicVisitedNationalParksProps {
  model: PublicVisitedNationalParksModel;
}

const SUMMARY_STAT_CARD_CLASS_NAME =
  "rounded-3xl border border-white/45 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-slate-950/56 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

export const PublicVisitedNationalParks = ({ model }: PublicVisitedNationalParksProps) => {
  const t = useTranslations("visits");

  if (model.visitedParks.length === 0) {
    return (
      <section className="rounded-[2rem] border border-dashed border-white/45 bg-white/54 p-8 text-center backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/40">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1.3rem] border border-white/50 bg-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <TentTree className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">{t("views.parks")}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{t("parks.empty")}</p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/55 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(219,234,254,0.66),rgba(220,252,231,0.72))] p-5 shadow-[0_24px_60px_rgba(59,130,246,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(2,6,23,0.76),rgba(15,23,42,0.86),rgba(6,78,59,0.38))] dark:shadow-[0_28px_64px_rgba(2,6,23,0.34)] sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-white/62 px-3 py-1 text-sm font-medium text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-emerald-300/15 dark:bg-slate-950/48 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <TentTree className="h-4 w-4" aria-hidden="true" />
                <span>{t("parks.summary.title")}</span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                {t("parks.summary.description")}
              </p>
            </div>

            <div className="min-w-0 rounded-[1.8rem] border border-emerald-700/15 bg-white/74 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] dark:border-emerald-300/15 dark:bg-slate-950/56 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                {t("parks.summary.progressLabel")}
              </p>
              <div className="mt-3">
                <span className="text-4xl font-semibold tracking-tight">
                  {model.visitedNationalParkCount} / {model.totalNationalParks}
                </span>
              </div>
            </div>
          </div>

          <div
            aria-label={t("parks.summary.progressLabel")}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={model.progressPercent}
            className="h-4 overflow-hidden rounded-full border border-white/45 bg-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.52)] dark:border-white/10 dark:bg-slate-950/54 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#166534_0%,#0f766e_42%,#2563eb_100%)] shadow-[0_10px_24px_rgba(37,99,235,0.24)] transition-[width]"
              style={{ width: `${model.progressPercent}%` }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className={SUMMARY_STAT_CARD_CLASS_NAME}>
              <div className="flex items-center gap-2 text-primary">
                <CalendarRange className="h-4 w-4" aria-hidden="true" />
                <p className="text-sm font-medium">{t("parks.summary.firstPark")}</p>
              </div>
              <p className="mt-3 text-lg font-semibold tracking-tight">
                {model.firstMagnetEarnedOn ? formatFinnishDate(model.firstMagnetEarnedOn) : "—"}
              </p>
            </div>

            <div className={SUMMARY_STAT_CARD_CLASS_NAME}>
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <p className="text-sm font-medium">{t("parks.summary.latestPark")}</p>
              </div>
              <p className="mt-3 text-lg font-semibold tracking-tight">
                {model.latestMagnetEarnedOn ? formatFinnishDate(model.latestMagnetEarnedOn) : "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {model.visitedParks.map((park) => (
          <article
            key={park.park.slug}
            className="rounded-[2rem] border border-white/50 bg-white/70 p-5 shadow-[0_20px_48px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50 dark:shadow-[0_24px_52px_rgba(2,6,23,0.32)]"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] border border-emerald-700/15 bg-[linear-gradient(145deg,#166534_0%,#0f766e_55%,#2563eb_100%)] text-lg font-semibold text-primary-foreground shadow-[0_10px_24px_rgba(37,99,235,0.24)]">
                  {park.order}.
                </div>

                {park.park.logoUrl ? (
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden sm:h-20 sm:w-28 sm:rounded-3xl sm:border sm:border-white/45 sm:bg-white/76 sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:sm:border-white/10 dark:sm:bg-slate-950/56 dark:sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <AppImage
                      alt={park.park.name}
                      className="object-contain sm:p-3"
                      fill
                      sizes="(max-width: 639px) 80px, 112px"
                      src={park.park.logoUrl}
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
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                      {park.park.name}
                    </h2>
                  </Link>
                </div>
              </div>

              <div className="w-full space-y-5">
                <div className="rounded-[1.6rem] border border-emerald-700/15 bg-[linear-gradient(145deg,rgba(22,101,52,0.08),rgba(37,99,235,0.08),rgba(255,255,255,0.78))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.56)] dark:border-emerald-300/15 dark:bg-[linear-gradient(145deg,rgba(22,101,52,0.2),rgba(37,99,235,0.14),rgba(15,23,42,0.72))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                    {t("parks.item.firstVisit")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                    {formatFinnishDate(park.firstVisit.visitedOn)}
                  </p>
                </div>

                {park.laterVisits.length > 0 ? (
                  <details className="group rounded-[1.6rem] border border-white/45 bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:border-white/10 dark:bg-slate-950/48 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
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
                            className="flex items-center justify-between gap-3 rounded-2xl border border-white/40 bg-white/76 px-3 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition-colors hover:bg-white/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:hover:bg-slate-950/74"
                          >
                            <span>{formatFinnishDate(visit.visitedOn)}</span>
                            <span className="text-xs font-medium text-primary">
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
      </section>
    </div>
  );
};
