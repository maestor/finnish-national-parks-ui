import { EditVisitLink } from "@/components/visits/edit-visit-link";
import Link from "next/link";

interface LatestVisitEntry {
  id: number;
  parkName: string;
  parkSlug: string;
  createdAt: string;
}

interface LatestVisitEntriesProps {
  title: string;
  emptyMessage: string;
  visits: LatestVisitEntry[];
  showEditLinks?: boolean;
}

export const LatestVisitEntries = ({
  title,
  emptyMessage,
  visits,
  showEditLinks = false,
}: LatestVisitEntriesProps) => {
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("fi-FI");

  return (
    <section className="mt-8" aria-labelledby="latest-visit-entries-title">
      <h2 id="latest-visit-entries-title" className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {visits.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {visits.map((visit) => (
            <li key={visit.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <Link
                href={`/park/${visit.parkSlug}`}
                className="text-sm font-medium hover:underline"
              >
                {visit.parkName}
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{formatDate(visit.createdAt)}</span>
                {showEditLinks ? <EditVisitLink visitId={visit.id} /> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
