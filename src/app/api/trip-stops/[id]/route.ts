import { proxyBackendRequest } from "@/lib/backend-proxy";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export const PATCH = async (request: Request, { params }: RouteContext) => {
  const { id } = await params;
  return proxyBackendRequest(request, `/api/trip-stops/${id}`, { requireAdmin: true });
};

export const DELETE = async (request: Request, { params }: RouteContext) => {
  const { id } = await params;
  return proxyBackendRequest(request, `/api/trip-stops/${id}`, { requireAdmin: true });
};
