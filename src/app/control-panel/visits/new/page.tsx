import { getTranslations } from "next-intl/server";

export const generateMetadata = async () => {
  const t = await getTranslations("controlPanel");
  return {
    title: t("visits.newVisit.title"),
  };
};

const NewVisitPage = async () => {
  const t = await getTranslations("controlPanel.visits.newVisit");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
    </div>
  );
};

export default NewVisitPage;
