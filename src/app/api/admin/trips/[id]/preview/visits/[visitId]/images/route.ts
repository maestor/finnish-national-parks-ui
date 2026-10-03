import { proxyBackendRequest } from "@/lib/backend-proxy";

interface RouteContext {
  params: Promise<{ id: string; visitId: string }>;
}

export const GET = async (request: Request, { params }: RouteContext) => {
  const { id, visitId } = await params;
  const query = new URL(request.url).search;
  return proxyBackendRequest(
    request,
    `/api/admin/trips/${id}/preview/visits/${visitId}/images${query}`,
    { requireAdmin: true },
  );
};
