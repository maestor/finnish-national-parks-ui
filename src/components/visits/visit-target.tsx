import { Fragment, type ReactNode } from "react";
import type { Visit } from "@/lib/parks";

type Area = NonNullable<Visit["areas"]>[number];
type Target = Pick<Visit, "route" | "areas">;

export const hasVisitTarget = (visit: Target) =>
  Boolean(visit.route?.trim() || visit.areas?.length);

export const VisitTarget = ({
  visit,
  label,
  icon,
  className,
  primaryClassName,
  renderArea,
}: {
  visit: Target;
  label?: string;
  icon?: ReactNode;
  className?: string;
  primaryClassName?: string;
  renderArea?: (area: Area) => ReactNode;
}) => {
  if (!hasVisitTarget(visit)) return null;
  const text = visit.route?.trim();
  return (
    <span className={className}>
      {icon}
      <span className="min-w-0 wrap-anywhere">
        {label !== undefined && <span className="mr-1 font-semibold">{label}</span>}
        <span className={primaryClassName}>
          {text || <VisitAreaNames areas={visit.areas ?? []} renderArea={renderArea} />}
        </span>
        {!!text && !!visit.areas?.length && (
          <span className="mt-0.5 block text-sm font-normal">
            <VisitAreaNames areas={visit.areas} renderArea={renderArea} />
          </span>
        )}
      </span>
    </span>
  );
};

const VisitAreaNames = ({
  areas,
  renderArea,
}: {
  areas: Area[];
  renderArea: ((area: Area) => ReactNode) | undefined;
}) => (
  <span className="wrap-anywhere">
    {areas.map((area, index) => (
      <Fragment key={area.id}>
        {index !== 0 && ", "}
        <span>{renderArea ? renderArea(area) : area.name}</span>
      </Fragment>
    ))}
  </span>
);
