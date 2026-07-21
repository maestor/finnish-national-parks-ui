import { proxyBackendRequest } from "@/lib/backend-proxy";

interface RouteContext {
  params: Promise<{
    id: string;
    imageId: string;
  }>;
}

export const DELETE = async (request: Request, { params }: RouteContext) => {
  const { id, imageId } = await params;
  return proxyBackendRequest(request, `/api/visits/${id}/images/${imageId}`, {
    requireAdmin: true,
  });
};
