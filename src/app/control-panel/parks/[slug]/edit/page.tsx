import { ParkForm } from "@/components/parks/park-form";
import { apiFetch } from "@/lib/api";
import { buildPageMetadata } from "@/lib/page-metadata";
import type { ParkDetail } from "@/lib/parks";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface EditParkPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ updated?: string }>;
}

export const generateMetadata = async () => {
  const [t, metadataT] = await Promise.all([
    getTranslations("controlPanel.parks.edit"),
    getTranslations("metadata"),
  ]);
  return buildPageMetadata(t("title"), metadataT("title"));
};

const EditParkPage = async ({ params, searchParams }: EditParkPageProps) => {
  const t = await getTranslations("controlPanel.parks.edit");
  const { slug } = await params;
  const { updated } = await searchParams;
  const park = await apiFetch<ParkDetail>(`/api/parks/${slug}`).catch(() => null);

  if (park === null) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <Link
          href="/control-panel/parks"
          className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("backToList")}
        </Link>
        <Link
          href={`/park/${park.slug}`}
          className="font-medium text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("viewParkPage")}
        </Link>
      </div>
      {updated === "1" && (
        <output
          aria-live="polite"
          className="mt-4 block rounded-lg border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200"
        >
          {t("updatedNotice")}
        </output>
      )}
      <ParkForm park={park} />
    </div>
  );
};

export default EditParkPage;
