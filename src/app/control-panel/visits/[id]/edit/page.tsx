import { VisitForm } from "@/components/visits/visit-form";
import { VisitImageSection } from "@/components/visits/visit-image-section";
import { apiFetch } from "@/lib/api";
import type { Park, PersonalPark, VisitWithPark } from "@/lib/parks";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface EditVisitPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}

export const generateMetadata = async () => {
  const t = await getTranslations("controlPanel");
  return {
    title: t("visits.editVisit.title"),
  };
};

const EditVisitPage = async ({ params, searchParams }: EditVisitPageProps) => {
  const t = await getTranslations("controlPanel.visits.editVisit");
  const { id } = await params;
  const { created } = await searchParams;
  const visitId = Number(id);

  const [{ parks }, { parks: personalParks }] = await Promise.all([
    apiFetch<{ parks: Park[] }>("/api/parks"),
    apiFetch<{ parks: PersonalPark[] }>("/api/me/parks"),
  ]);

  let visitToEdit: VisitWithPark | undefined;
  for (const park of personalParks) {
    const visit = park.visits.find((v) => v.id === visitId);
    if (visit) {
      visitToEdit = { ...visit, parkSlug: park.slug, parkName: park.name };
      break;
    }
  }

  if (!visitToEdit) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      {created === "1" && (
        <output
          aria-live="polite"
          className="mt-4 block rounded-lg border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200"
        >
          {t("createdNotice")}
        </output>
      )}
      <VisitForm parks={parks} visitToEdit={visitToEdit} />
      <VisitImageSection visitId={visitToEdit.id} images={visitToEdit.images} />
    </div>
  );
};

export default EditVisitPage;
