import { useTranslations } from "next-intl";

interface ProgressItem {
  typeName: string;
  visited: number;
  total: number;
}

interface ProgressSectionProps {
  items: ProgressItem[];
}

export const ProgressSection = ({ items }: ProgressSectionProps) => {
  const t = useTranslations("controlPanel.dashboard.progress");

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
      <div className="mt-4 space-y-4">
        {items.map((item) => {
          const percentage = item.total > 0 ? Math.round((item.visited / item.total) * 100) : 0;
          return (
            <div key={item.typeName}>
              <div className="flex items-center justify-between text-sm">
                <span>{item.typeName}</span>
                <span className="text-muted-foreground">
                  {t("visitedOfTotal", { visited: item.visited, total: item.total })}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
