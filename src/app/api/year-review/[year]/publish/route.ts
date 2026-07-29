import { proxyBackendRequest } from "@/lib/backend-proxy";

interface RouteContext {
  params: Promise<{
    year: string;
  }>;
}

export const POST = async (request: Request, { params }: RouteContext) => {
  const { year } = await params;
  return proxyBackendRequest(request, `/api/year-review/${year}/publish`, {
    requireAdmin: true,
  });
};

export const DELETE = async (request: Request, { params }: RouteContext) => {
  const { year } = await params;
  return proxyBackendRequest(request, `/api/year-review/${year}/publish`, {
    requireAdmin: true,
  });
};
