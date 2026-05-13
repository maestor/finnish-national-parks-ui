import { getTranslations } from "next-intl/server";

export const generateMetadata = async () => {
  const t = await getTranslations("home");
  return {
    title: t("title"),
  };
};

const HomePage = async () => {
  const t = await getTranslations("home");

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-4 text-muted-foreground">{t("description")}</p>
    </div>
  );
};

export default HomePage;
