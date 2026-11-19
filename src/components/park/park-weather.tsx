"use client";

import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  CloudSunRain,
  Droplet,
  Info,
  type LucideIcon,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { type CSSProperties, useId } from "react";
import { useParkWeather, weatherMetrics } from "@/components/park/park-weather-state";
import { Button } from "@/components/ui/button";
import { TOOLTIP_CONTENT_CLASS_NAME } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import styles from "./park-weather.module.css";

const timezone = "Europe/Helsinki";
const finnishDate = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("fi-FI", { timeZone: timezone, ...options });
const clock = finnishDate({ hour: "numeric", minute: "2-digit" });
const day = finnishDate({ day: "numeric", month: "numeric" });
const date = finnishDate({
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const number = new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 1 });
const metricStyles = {
  temperature: "text-xs font-semibold sm:text-base",
  precipitation: "text-xs sm:text-sm",
  wind: "text-xs text-muted-foreground sm:text-sm",
};
const windDirections = [
  "north",
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
] as const;

const metricIcons = { temperature: Thermometer, precipitation: Droplet, wind: Wind };

// FMI WeatherSymbol3 codes, grouped by the symbol shown next to each time.
const conditionIcons = new Map<number, LucideIcon>([
  [1, Sun],
  [2, CloudSun],
  [3, Cloud],
  ...[21, 22, 23].map((code) => [code, CloudSunRain] as const),
  [31, CloudDrizzle],
  [32, CloudRain],
  [33, CloudRain],
  ...[41, 42, 43, 51, 52, 53, 71, 72, 73, 81, 82, 83].map((code) => [code, CloudSnow] as const),
  ...[61, 62, 63, 64].map((code) => [code, CloudLightning] as const),
  [91, CloudFog],
  [92, CloudFog],
]);

export const ParkWeather = () => {
  const t = useTranslations("park.weather");
  const weather = useParkWeather()?.weather;
  const id = useId();
  const titleId = `${id}-title`;
  const sourceId = `${id}-source`;
  if (!weather?.observation && !weather?.forecast) return null;

  const { observation, forecast } = weather;
  const observedTime =
    [observation?.temperature?.time, observation?.wind?.time]
      .filter((time) => time !== undefined)
      .sort()
      .at(-1) ?? observation?.precipitation?.time;
  const formatDate = (time: string) => date.format(new Date(time));
  const formatTime = (time: string) => clock.format(new Date(time));
  let previousDay = day.format(Date.now());
  const slots = [
    ...(observation
      ? [
          {
            label: t("now"),
            key: "now",
            observed: true,
            dayLabel: undefined,
            symbol: undefined,
            readings: weatherMetrics.flatMap((metric) => {
              const reading = observation[metric];
              return reading
                ? [
                    {
                      metric,
                      value: reading.value,
                      time: reading.time,
                      directionDegrees:
                        metric === "wind" ? observation.wind?.directionDegrees : undefined,
                      feelsLikeTemperature:
                        metric === "temperature"
                          ? observation.temperature?.feelsLikeTemperature
                          : undefined,
                    },
                  ]
                : [];
            }),
          },
        ]
      : []),
    ...(forecast?.slots ?? []).map((slot) => {
      const slotDay = day.format(new Date(slot.time));
      const dayLabel = slotDay === previousDay ? undefined : slotDay;
      previousDay = slotDay;
      return {
        label: formatTime(slot.time),
        key: slot.time,
        observed: false,
        dayLabel,
        symbol: slot.weatherSymbol,
        readings: weatherMetrics.flatMap((metric) => {
          const value = slot[metric];
          return value === undefined
            ? []
            : [
                {
                  metric,
                  value,
                  time: slot.time,
                  directionDegrees: metric === "wind" ? slot.windDirectionDegrees : undefined,
                  feelsLikeTemperature:
                    metric === "temperature" ? slot.feelsLikeTemperature : undefined,
                },
              ];
        }),
      };
    }),
  ];
  const visibleMetrics = weatherMetrics.filter((metric) =>
    slots.some(({ readings }) => readings.some((reading) => reading.metric === metric)),
  );

  const formatReading = (
    metric: (typeof weatherMetrics)[number],
    {
      time,
      value,
      directionDegrees,
      feelsLikeTemperature,
    }: {
      time: string;
      value: number;
      directionDegrees?: number;
      feelsLikeTemperature?: number;
    },
    observed: boolean,
  ) => {
    const trace = metric === "precipitation" && observed && value === 0;
    const numericValue = number.format(metric === "precipitation" && value === -1 ? 0 : value);
    const direction =
      directionDegrees === undefined
        ? undefined
        : windDirections[Math.round(directionDegrees / 45) % windDirections.length];
    const readingTitle = trace ? t("traceTitle") : t(`${metric}Title`, { value: numericValue });
    const title =
      feelsLikeTemperature === undefined
        ? readingTitle
        : t("temperatureFeelsLike", {
            reading: readingTitle,
            value: number.format(feelsLikeTemperature),
          });
    const spoken = metric === "wind" ? t("windSpoken", { value: numericValue }) : title;
    const withDirection = (reading: string) =>
      direction
        ? t("windWithDirection", { reading, direction: t(`directions.${direction}`) })
        : reading;

    return {
      title: withDirection(title),
      spoken: t(observed ? "observedValue" : "forecastValue", {
        reading: withDirection(spoken),
        time: formatDate(time),
      }),
      display: trace ? t("trace") : t(`${metric}Value`, { value: numericValue }),
    };
  };

  return (
    <section aria-labelledby={titleId} className="mt-5">
      <div className="@container rounded-2xl border border-border/60 bg-control/45 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3
            id={titleId}
            className="min-w-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase wrap-anywhere"
          >
            {t("title")}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-my-2 -mr-2 min-h-11 shrink-0 gap-1 rounded-xl px-2 text-xs text-link"
            popoverTarget={sourceId}
          >
            <Info aria-hidden="true" className="size-4 shrink-0" />
            {t("source")}
          </Button>
          <section
            id={sourceId}
            popover="auto"
            aria-label={t("source")}
            className={cn(
              TOOLTIP_CONTENT_CLASS_NAME,
              "pointer-events-auto w-72 max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] space-y-2 overflow-auto px-4 py-3 text-left text-sm leading-normal font-normal wrap-anywhere",
              "[position-area:bottom_span-left] [position-try-fallbacks:flip-block] supports-[position-area:bottom]:inset-auto supports-[position-area:bottom]:mx-0 supports-[position-area:bottom]:my-2 supports-[position-area:bottom]:justify-self-end",
            )}
          >
            {observation !== undefined && observedTime !== undefined && (
              <p>
                {t("observation", {
                  time: formatTime(observedTime),
                  station: observation.station.name,
                  distance: number.format(observation.station.distanceMetres / 1000),
                })}
              </p>
            )}
            <p className="flex flex-wrap items-baseline gap-x-2">
              <a className="text-link underline" href="https://www.ilmatieteenlaitos.fi/avoin-data">
                {t("fmi")}
              </a>
              <a
                className="text-link underline"
                href="https://creativecommons.org/licenses/by/4.0/deed.fi"
              >
                {t("licence")}
              </a>
            </p>
          </section>
        </div>
        <div
          className="mt-2"
          style={
            {
              "--weather-metrics": visibleMetrics.length,
              "--weather-slots": slots.length,
            } as CSSProperties
          }
        >
          <div
            aria-hidden="true"
            className={cn(styles.metricLegend, "items-center pb-1 text-link")}
          >
            {visibleMetrics.map((metric, rowIndex) => {
              const Icon = metricIcons[metric];
              return (
                <Icon
                  key={metric}
                  className="mx-auto size-4"
                  style={{ gridColumn: rowIndex + 2 }}
                />
              );
            })}
          </div>
          <ul
            // biome-ignore lint/a11y/noRedundantRoles: Preserve list semantics in VoiceOver.
            role="list"
            aria-labelledby={titleId}
            className={cn(
              styles.slots,
              "divide-y divide-border/60 text-center tabular-nums @min-[23rem]:divide-y-0",
            )}
          >
            {slots.map(({ label, key, readings, observed, dayLabel, symbol }, slotIndex) => {
              const Icon = (symbol === undefined ? undefined : conditionIcons.get(symbol)) ?? Info;
              const condition =
                symbol !== undefined && conditionIcons.has(symbol)
                  ? t(`conditions.${symbol}`)
                  : undefined;
              const detailId = `${id}-details-${key}`;
              const detailsLabel = observed
                ? t("currentDetails")
                : t("forecastDetails", { time: formatDate(key) });
              const formattedReadings = readings.map((reading) => ({
                metric: reading.metric,
                ...formatReading(reading.metric, reading, observed),
              }));

              return (
                <li key={key} className={cn(styles.slot, "min-w-0 py-1 @min-[23rem]:p-0")}>
                  <div className={styles.time}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto min-h-11 min-w-11 gap-0.5 rounded-lg bg-background/25 px-1 py-0 text-xs text-link sm:text-sm"
                      aria-label={detailsLabel}
                      title={condition}
                      popoverTarget={detailId}
                    >
                      <span className="flex flex-col">
                        {dayLabel !== undefined && (
                          <span className="text-xs text-muted-foreground">{dayLabel}</span>
                        )}
                        {observed ? <span>{label}</span> : <time dateTime={key}>{label}</time>}
                      </span>
                      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                    </Button>
                    <section
                      id={detailId}
                      popover="auto"
                      aria-label={detailsLabel}
                      className={cn(
                        TOOLTIP_CONTENT_CLASS_NAME,
                        "pointer-events-auto w-max max-h-[calc(100dvh-1rem)] max-w-[min(calc(100vw-1.25rem),18rem)] space-y-2 overflow-auto px-3 py-2 text-left text-sm leading-normal font-normal wrap-anywhere",
                        "[position-area:bottom_span-all] [position-try-fallbacks:flip-block] supports-[position-area:bottom]:inset-auto supports-[position-area:bottom]:mx-2 supports-[position-area:bottom]:my-1",
                      )}
                    >
                      {condition !== undefined && <p className="font-semibold">{condition}</p>}
                      {formattedReadings.map(({ metric, title }) => (
                        <p key={metric}>{title}</p>
                      ))}
                    </section>
                  </div>
                  {visibleMetrics.map((metric, rowIndex) => {
                    const formatted = formattedReadings.find(
                      (reading) => reading.metric === metric,
                    );

                    const Icon = metricIcons[metric];
                    return (
                      <span
                        key={metric}
                        aria-hidden={formatted === undefined ? true : undefined}
                        className={cn(
                          styles.reading,
                          "relative min-w-0 wrap-anywhere",
                          metricStyles[metric],
                          formatted === undefined && "hidden @min-[23rem]:block",
                        )}
                        style={{ "--weather-metric": rowIndex + 1 } as CSSProperties}
                      >
                        {slotIndex === 0 && (
                          <span
                            aria-hidden="true"
                            className="absolute top-1/2 -left-7 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-background/50 text-link @min-[23rem]:inline-flex"
                          >
                            <Icon className="size-3.5" />
                          </span>
                        )}
                        {formatted !== undefined && (
                          <>
                            <span className="sr-only">{formatted.spoken}</span>
                            <span aria-hidden="true" title={formatted.title}>
                              {formatted.display}
                            </span>
                          </>
                        )}
                      </span>
                    );
                  })}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};
