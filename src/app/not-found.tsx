import { getTranslations } from "next-intl/server";
import Link from "next/link";

const NotFoundPage = async () => {
  const t = await getTranslations("errors.notFound");

  return (
    <div className="container mx-auto flex flex-1 flex-col items-center justify-center py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{t("description")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {t("goHome")}
      </Link>
    </div>
  );
};

export default NotFoundPage;
