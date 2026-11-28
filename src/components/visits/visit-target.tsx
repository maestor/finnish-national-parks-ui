import type { ReactNode } from "react";
import type { Visit } from "@/lib/parks";

type Area = NonNullable<Visit["areas"]>[number];
type Target = Pick<Visit, "route" | "areas">;

export const hasVisitTarget = (visit: Target) =>
  Boolean(visit.route?.trim() || visit.areas?.length);

export const VisitTarget = ({
  visit,
  label,
  className,
  primaryClassName,
}: {
  visit: Target;
  label?: string;
  className?: string;
  primaryClassName?: string;
}) => {
  if (!hasVisitTarget(visit)) return null;
  const text = visit.route?.trim() || visit.areas?.map(({ name }) => name).join(", ");
  return (
    <span className={className}>
      <span className="min-w-0 wrap-anywhere">
        {label !== undefined && <span className="mr-1 font-semibold">{label}</span>}
        <span className={primaryClassName}>{text}</span>
      </span>
    </span>
  );
};

export const VisitTargetBadges = ({
  visit,
  icon,
  className,
  primaryClassName,
  renderArea,
}: {
  visit: Target;
  icon: ReactNode;
  className: string;
  primaryClassName?: string;
  renderArea?: (area: Area) => ReactNode;
}) => {
  const text = visit.route?.trim();
  const badge = (key: number | string, content: ReactNode) => (
    <span key={key} className={className}>
      {icon}
      <span className="min-w-0 wrap-anywhere">
        <span className={primaryClassName}>{content}</span>
      </span>
    </span>
  );
  return text
    ? badge("route", text)
    : visit.areas?.map((area) => badge(area.id, renderArea ? renderArea(area) : area.name));
};
