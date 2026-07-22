import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { VisitForm } from "@/components/visits/visit-form";
import { VisitImageSection } from "@/components/visits/visit-image-section";
import { apiFetch } from "@/lib/api";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { Park, VisitWithPark } from "@/lib/parks";
import { appRoutes } from "@/lib/routes";
import type { Trip } from "@/lib/trips";

export const dynamic = "force-dynamic";

interface EditVisitPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel"),
    getTranslations("metadata"),
  ]);
  return buildPageMetadata(t("visits.editVisit.title"), metadataT("title"));
};

const EditVisitPage = async ({ params, searchParams }: EditVisitPageProps) => {
  const t = await getTranslations("controlPanel.visits.editVisit");
  const { id } = await params;
  const { created } = await searchParams;
  const visitId = Number(id);

  const [{ parks }, { trips }, visitToEdit] = await Promise.all([
    apiFetch<{ parks: Park[] }>("/api/parks"),
    apiFetch<{ trips: Trip[] }>("/api/trips"),
    apiFetch<VisitWithPark>(`/api/visits/${visitId}`).catch(() => null),
  ]);

  if (visitToEdit === null) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <Link
        href={appRoutes.park(visitToEdit.park.slug)}
        className="mt-3 inline-flex text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {t("viewParkPage")}
      </Link>
      {created === "1" && (
        <output
          aria-live="polite"
          className="mt-4 block rounded-lg border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200"
        >
          {t("createdNotice")}
        </output>
      )}
      <VisitForm parks={parks} trips={trips} visitToEdit={visitToEdit} />
      <VisitImageSection
        visitId={visitToEdit.id}
        images={visitToEdit.images}
        parkSlug={visitToEdit.park.slug}
        sectionTitle={t("manageImages")}
      />
    </div>
  );
};

export default EditVisitPage;
