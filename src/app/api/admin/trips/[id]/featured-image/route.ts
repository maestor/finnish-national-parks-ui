import { proxyBackendRequest } from "@/lib/backend-proxy";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = async (request: Request, { params }: RouteContext) => {
  const { id } = await params;
  return proxyBackendRequest(request, `/api/admin/trips/${id}/featured-image`, {
    requireAdmin: true,
  });
};

export const PATCH = async (request: Request, { params }: RouteContext) => {
  const { id } = await params;
  return proxyBackendRequest(request, `/api/admin/trips/${id}/featured-image`, {
    requireAdmin: true,
  });
};
