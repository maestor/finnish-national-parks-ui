import { getTranslations } from "next-intl/server";

interface ParkDetailPageProps {
  params: Promise<{ slug: string }>;
}

export const generateMetadata = async ({ params }: ParkDetailPageProps) => {
  const { slug } = await params;
  return {
    title: slug.replace(/-/g, " "),
  };
};

const ParkDetailPage = async ({ params }: ParkDetailPageProps) => {
  const { slug } = await params;
  const t = await getTranslations("park");

  return (
    <article className="container py-8">
      <h1 className="text-3xl font-bold tracking-tight capitalize">{slug.replace(/-/g, " ")}</h1>
      <p className="mt-4 text-muted-foreground">
        {t("detailTitle")}: <code className="rounded bg-muted px-1 py-0.5 text-sm">{slug}</code>.
      </p>
    </article>
  );
};

export default ParkDetailPage;
