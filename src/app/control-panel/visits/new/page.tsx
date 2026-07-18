import { getTranslations } from "next-intl/server";
import { VisitForm } from "@/components/visits/visit-form";
import { apiFetch } from "@/lib/api";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { Park } from "@/lib/parks";

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel"),
    getTranslations("metadata"),
  ]);
  return buildPageMetadata(t("visits.newVisit.title"), metadataT("title"));
};

interface NewVisitPageProps {
  searchParams: Promise<{ park?: string }>;
}

const NewVisitPage = async ({ searchParams }: NewVisitPageProps) => {
  const t = await getTranslations("controlPanel.visits.newVisit");
  const { park } = await searchParams;
  const { parks } = await apiFetch<{ parks: Park[] }>("/api/parks");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <VisitForm parks={parks} defaultParkSlug={park} />
    </div>
  );
};

export default NewVisitPage;
