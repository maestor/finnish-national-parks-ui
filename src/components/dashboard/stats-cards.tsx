import { useTranslations } from "next-intl";

interface StatsCardsProps {
  totalVisits: number;
  uniqueParks: number;
  parksWithNotes: number;
  mostVisitedPark: { name: string; visitCount: number } | null;
}

export const StatsCards = ({
  totalVisits,
  uniqueParks,
  parksWithNotes,
  mostVisitedPark,
}: StatsCardsProps) => {
  const t = useTranslations("controlPanel.dashboard.stats");

  const cards = [
    { label: t("totalVisits"), value: totalVisits },
    { label: t("uniqueParks"), value: uniqueParks },
    { label: t("parksWithNotes"), value: parksWithNotes },
    {
      label: t("mostVisited"),
      value: mostVisitedPark ? `${mostVisitedPark.name} (${mostVisitedPark.visitCount})` : "–",
    },
  ];

  const sizeClasses = ["text-3xl", "text-3xl", "text-3xl", "text-lg"];

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <div key={card.label} className="rounded-lg border bg-card p-4 text-card-foreground">
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className={`mt-1 font-semibold tracking-tight ${sizeClasses[index]}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
};
