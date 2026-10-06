import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { VisitAccordion } from "@/components/park/visit-accordion";
import { ApiError, apiAuthFetch } from "@/lib/api";
import type { AdminVisitWithPark } from "@/lib/parks";
import { appRoutes } from "@/lib/routes";

export const dynamic = "force-dynamic";

interface VisitPreviewPageProps {
  params: Promise<{ id: string }>;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("controlPanel.visits.preview");
  return { title: t("title"), robots: { index: false, follow: false } };
};

const VisitPreviewPage = async ({ params }: VisitPreviewPageProps) => {
  const t = await getTranslations("controlPanel.visits.preview");
  const { id } = await params;
  const visitId = Number(id);
  if (!Number.isInteger(visitId) || visitId < 1) notFound();

  const visit = await apiAuthFetch<AdminVisitWithPark>(`/api/admin/visits/${visitId}`, {
    cache: "no-store",
  }).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  });

  if (visit === null) notFound();

  return (
    <main className="space-y-6">
      <AppBreadcrumbs path={appRoutes.controlPanel.previewVisit(visit.id)} className="mb-4" />
      <div className="rounded-3xl border border-amber-300/60 bg-amber-50/90 p-5 text-amber-950 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
        <p className="font-semibold">{t("banner")}</p>
        <p className="mt-1 text-sm">{t("description")}</p>
        <Link
          href={appRoutes.controlPanel.editVisit(visit.id)}
          className="mt-3 inline-flex rounded-md underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("backToEdit")}
        </Link>
      </div>
      <section aria-label={t("contentLabel")}>
        <h1 className="mb-4 text-2xl font-bold tracking-tight">{visit.park.name}</h1>
        <VisitAccordion
          visits={[visit]}
          parkSlug={visit.park.slug}
          initialOpenVisitId={visit.id}
          isPreview
        />
      </section>
    </main>
  );
};

export default VisitPreviewPage;
