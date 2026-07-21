import { proxyBackendRequest } from "@/lib/backend-proxy";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export const POST = async (request: Request, { params }: RouteContext) => {
  const { id } = await params;
  return proxyBackendRequest(request, `/api/visits/${id}/images/complete`, { requireAdmin: true });
};
