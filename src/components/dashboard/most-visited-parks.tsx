import Link from "next/link";

interface MostVisitedPark {
  parkName: string;
  parkSlug: string;
  visitCount: number;
}

interface MostVisitedParksProps {
  title: string;
  emptyMessage: string;
  visitCountLabel: string;
  parks: MostVisitedPark[];
}

export const MostVisitedParks = ({
  title,
  emptyMessage,
  visitCountLabel,
  parks,
}: MostVisitedParksProps) => {
  return (
    <section className="mt-8" aria-labelledby="most-visited-parks-title">
      <h2 id="most-visited-parks-title" className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {parks.length === 0 ? (
        <p className="mt-4 text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {parks.map((park) => (
            <li key={park.parkSlug} className="flex items-center justify-between gap-4 px-4 py-3">
              <Link href={`/park/${park.parkSlug}`} className="text-sm font-medium hover:underline">
                {park.parkName}
              </Link>
              <span className="text-sm text-muted-foreground">{`${park.visitCount} ${visitCountLabel}`}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
