import { MapPin, Route } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Visit } from "@/lib/parks";
import { getVisitDetailAreas } from "@/lib/public-visits";

type Location = { id: number; name: string; slug: string };
type Navigation = { areaSlugs: string[]; trailSlugs: string[]; navigate: (slug: string) => void };
type HeadingLevel = 3 | 4;

export const VisitLocationSections = ({
  visit,
  headingLevel,
  navigation,
}: {
  visit: Pick<Visit, "route" | "areas" | "trails">;
  headingLevel: HeadingLevel;
  navigation?: Navigation | null;
}) => (
  <>
    <VisitLocationSection
      locations={getVisitDetailAreas(visit)}
      headingLevel={headingLevel}
      kind="area"
      navigation={navigation}
    />
    <VisitLocationSection
      locations={visit.trails}
      headingLevel={headingLevel}
      kind="trail"
      navigation={navigation}
    />
  </>
);

const VisitLocationSection = ({
  locations,
  headingLevel,
  kind,
  navigation,
}: {
  locations?: Location[];
  headingLevel: HeadingLevel;
  kind: "area" | "trail";
  navigation?: Navigation | null;
}) => {
  const t = useTranslations("park");
  if (!locations?.length) return null;

  const Icon = kind === "area" ? MapPin : Route;
  const Heading = headingLevel === 3 ? "h3" : "h4";
  const slugsKey = kind === "area" ? "areaSlugs" : "trailSlugs";
  const badgeClassName =
    "inline-flex items-center gap-1.5 rounded-full border border-border theme-memory px-2.5 py-1 text-sm leading-none font-semibold text-emerald-900 shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] dark:text-emerald-200 dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.08)] max-w-full leading-snug";

  return (
    <section className="space-y-3">
      <Heading className="flex items-center gap-2 border-b border-border pb-2 text-base font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {t(kind === "area" ? "areasTitle" : "trailsTitle")}
      </Heading>
      <ul className="flex flex-wrap gap-2">
        {locations.map((location) => (
          <li key={location.id} className="min-w-0 max-w-full">
            {navigation?.[slugsKey].includes(location.slug) ? (
              <button
                type="button"
                aria-label={t("showLocationOnMap", { name: location.name })}
                onClick={() => navigation.navigate(location.slug)}
                className={`${badgeClassName} relative cursor-pointer after:absolute after:inset-x-0 after:-inset-y-1 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 wrap-break-word">{location.name}</span>
              </button>
            ) : (
              <span className={badgeClassName}>
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 wrap-break-word">{location.name}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
