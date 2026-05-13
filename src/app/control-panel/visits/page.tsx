import { getTranslations } from "next-intl/server";
import Link from "next/link";

export const generateMetadata = async () => {
  const t = await getTranslations("controlPanel");
  return {
    title: t("visits.title"),
  };
};

const VisitsPage = async () => {
  const t = await getTranslations("controlPanel.visits");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <Link
          href="/control-panel/visits/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("addVisit")}
        </Link>
      </div>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
    </div>
  );
};

export default VisitsPage;
