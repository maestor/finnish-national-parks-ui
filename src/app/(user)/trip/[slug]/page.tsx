import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PublicTripPage } from "@/components/trips/public-trip-page";
import { ApiError } from "@/lib/api";
import { buildPageMetadata } from "@/lib/page-metadata";
import { fetchPublicTripBySlug } from "@/lib/public-trip";

interface PublicTripRoutePageProps {
  params: Promise<{ slug: string }>;
}

const fetchTripForRequest = async (slug: string) => {
  try {
    return await fetchPublicTripBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
};

export const generateMetadata = async ({ params }: PublicTripRoutePageProps) => {
  const [{ slug }, metadataT] = await Promise.all([params, getTranslations("metadata")]);
  const trip = await fetchTripForRequest(slug);

  if (!trip) {
    return buildPageMetadata(slug.replace(/-/g, " "), metadataT("title"));
  }

  return buildPageMetadata(trip.name, metadataT("title"), {
    description: trip.description ?? undefined,
  });
};

const PublicTripRoutePage = async ({ params }: PublicTripRoutePageProps) => {
  const { slug } = await params;
  const trip = await fetchTripForRequest(slug);

  if (!trip) {
    notFound();
  }

  return <PublicTripPage trip={trip} />;
};

export default PublicTripRoutePage;
