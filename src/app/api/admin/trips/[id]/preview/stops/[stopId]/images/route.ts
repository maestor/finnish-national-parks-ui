import { proxyBackendRequest } from "@/lib/backend-proxy";

interface RouteContext {
  params: Promise<{ id: string; stopId: string }>;
}

export const GET = async (request: Request, { params }: RouteContext) => {
  const { id, stopId } = await params;
  const query = new URL(request.url).search;
  return proxyBackendRequest(
    request,
    `/api/admin/trips/${id}/preview/stops/${stopId}/images${query}`,
    { requireAdmin: true },
  );
};
