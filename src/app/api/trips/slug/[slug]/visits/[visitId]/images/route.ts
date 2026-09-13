import { ApiError, apiPublicFetch } from "@/lib/api";
import { PUBLIC_TRIP_VISIT_IMAGES_REQUEST_TIMEOUT_MS } from "@/lib/public-trip-timeout";

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

interface RouteContext {
  params: Promise<{ slug: string; visitId: string }>;
}

export const GET = async (request: Request, { params }: RouteContext) => {
  const { slug, visitId } = await params;
  const search = new URL(request.url).search;

  try {
    const result = await apiPublicFetch(
      `/api/trips/slug/${encodeURIComponent(slug)}/visits/${encodeURIComponent(visitId)}/images${search}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(PUBLIC_TRIP_VISIT_IMAGES_REQUEST_TIMEOUT_MS),
      },
    );

    return Response.json(result, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return Response.json(
        { error: "Not found" },
        { headers: PRIVATE_NO_STORE_HEADERS, status: 404 },
      );
    }

    throw error;
  }
};
