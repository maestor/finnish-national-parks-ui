import { ApiError, apiPublicFetch } from "@/lib/api";
import { PUBLIC_TRIP_REQUEST_TIMEOUT_MS } from "@/lib/public-trip-timeout";

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export const GET = async (_request: Request, { params }: RouteContext) => {
  const { slug } = await params;

  try {
    const result = await apiPublicFetch(`/api/trips/slug/${encodeURIComponent(slug)}/route`, {
      cache: "no-store",
      signal: AbortSignal.timeout(PUBLIC_TRIP_REQUEST_TIMEOUT_MS),
    });

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
