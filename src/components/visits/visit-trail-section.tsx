import { Route } from "lucide-react";
import { useTranslations } from "next-intl";

type Trail = { id: number; name: string; slug: string };

export const VisitTrailSection = ({
  trails,
  headingLevel,
  navigation,
}: {
  trails?: Trail[];
  headingLevel: 3 | 4;
  navigation?: { trailSlugs: string[]; navigate: (slug: string) => void } | null;
}) => {
  const t = useTranslations("park");
  if (!trails?.length) return null;

  const Heading = headingLevel === 3 ? "h3" : "h4";
  const badgeClassName =
    "inline-flex items-center gap-1.5 rounded-full border border-border theme-memory px-2.5 py-1 text-sm leading-none font-semibold text-emerald-900 shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.55)] dark:text-emerald-200 dark:shadow-[inset_0_1px_0_rgba(var(--highlight-rgb),0.08)] max-w-full leading-snug";

  return (
    <section className="space-y-3">
      <Heading className="flex items-center gap-2 border-b border-border pb-2 text-base font-semibold">
        <Route className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {t("trailsTitle")}
      </Heading>
      <ul className="flex flex-wrap gap-2">
        {trails.map((trail) => (
          <li key={trail.id} className="min-w-0 max-w-full">
            {navigation?.trailSlugs.includes(trail.slug) ? (
              <button
                type="button"
                aria-label={t("showTrailOnMap", { name: trail.name })}
                onClick={() => navigation.navigate(trail.slug)}
                className={`${badgeClassName} relative cursor-pointer after:absolute after:inset-x-0 after:-inset-y-1 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
              >
                <Route className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 wrap-break-word">{trail.name}</span>
              </button>
            ) : (
              <span className={badgeClassName}>
                <Route className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 wrap-break-word">{trail.name}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
