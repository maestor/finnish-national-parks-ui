import { getTranslations } from "next-intl/server";

const OfflinePage = async () => {
  const t = await getTranslations("errors.offline");

  return (
    <div className="container mx-auto flex flex-1 flex-col items-center justify-center py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-4 text-muted-foreground">{t("description")}</p>
    </div>
  );
};

export default OfflinePage;
