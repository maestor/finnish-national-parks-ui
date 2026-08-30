import { fetchPublicTripBySlug } from "@/lib/public-trip";
import { createSocialPreviewImageResponse } from "@/lib/social-preview-image";

export const dynamic = "force-dynamic";

export const GET = async (_request: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  try {
    const trip = await fetchPublicTripBySlug(slug);
    if (trip.publication?.coverImage?.fullUrl) {
      return Response.redirect(trip.publication.coverImage.fullUrl, 307);
    }
    return createSocialPreviewImageResponse({
      title: trip.name,
      description: trip.publication?.summary ?? trip.description ?? "",
      highlights: [],
      imageUrl: null,
      variant: "landscape",
      width: 1200,
      height: 630,
    });
  } catch {
    return new Response(null, { status: 404 });
  }
};
