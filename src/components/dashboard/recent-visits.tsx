import { useTranslations } from "next-intl";
import Link from "next/link";

interface RecentVisit {
  id: number;
  parkName: string;
  parkSlug: string;
  visitedOn: string;
}

interface RecentVisitsProps {
  visits: RecentVisit[];
}

export const RecentVisits = ({ visits }: RecentVisitsProps) => {
  const t = useTranslations("controlPanel.dashboard.recentVisits");

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
        <Link
          href="/control-panel/visits"
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          {t("viewAll")}
        </Link>
      </div>
      {visits.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{t("noVisits")}</p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {visits.map((visit) => (
            <li key={visit.id} className="flex items-center justify-between px-4 py-3">
              <Link
                href={`/park/${visit.parkSlug}`}
                className="text-sm font-medium hover:underline"
              >
                {visit.parkName}
              </Link>
              <span className="text-sm text-muted-foreground">{visit.visitedOn}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
